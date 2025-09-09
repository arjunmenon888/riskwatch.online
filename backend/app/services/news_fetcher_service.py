# filepath: backend/app/services/news_fetcher_service.py
import asyncio
import httpx
from bs4 import BeautifulSoup
import trafilatura
import google.generativeai as genai
from datetime import datetime
from typing import List, Dict, Any, AsyncGenerator, Optional
from urllib.parse import urljoin, urlparse
from PIL import Image, ImageDraw, ImageFont
import io
import uuid
import os
import json
import boto3
from botocore.client import Config

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.user import Post, User
from app.models.news import NewsSource
from app.schemas.post import FetchStatus

# Configure Google Gemini API
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

class NewsFetcherService:
    """
    An asynchronous service to fetch all latest articles from a persistent
    list of news sources stored in the database.
    """

    def __init__(self, db: AsyncSession, superadmin: User):
        self.db = db
        self.superadmin = superadmin
        # --- NEW: Configurable limit for links per source ---
        self.max_links_per_source = 10
        self.client = httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.processed_urls = set()
        
        # Initialize R2 client if configured
        self.r2_client = None
        if all([settings.R2_ACCOUNT_ID, settings.R2_ACCESS_KEY_ID, settings.R2_SECRET_ACCESS_KEY]):
            self.r2_client = boto3.client(
                's3',
                endpoint_url=f'https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=Config(signature_version='s3v4')
            )
            print("Cloudflare R2 client initialized.")
        else:
            print("Cloudflare R2 not configured. Images will be stored locally.")

    async def run(self) -> AsyncGenerator[FetchStatus, None]:
        yield FetchStatus(stage="Initializing", progress=0, message="Fetching saved news sources...")
        
        sources_result = await self.db.execute(select(NewsSource))
        sources = sources_result.scalars().all()
        
        if not sources:
            yield FetchStatus(stage="Complete", progress=100, message="No news sources configured. Add sources to begin.", is_complete=True)
            return

        yield FetchStatus(stage="Initializing", progress=5, message=f"Found {len(sources)} sources. Starting fetch loop.")
        total_sources = len(sources)
        progress_per_source = 95 / total_sources

        # --- REFACTORED MAIN LOOP ---
        for i, source in enumerate(sources):
            current_source_progress_base = 5 + (i * progress_per_source)
            yield FetchStatus(stage="Discovery", progress=current_source_progress_base, message=f"({i+1}/{total_sources}) Discovering articles from: {source.name}")
            
            try:
                article_urls = await self._discover_all_links(source)
                if not article_urls:
                    yield FetchStatus(stage="Discovery", progress=current_source_progress_base + progress_per_source, message=f"No new links found for {source.name}.")
                    continue

                yield FetchStatus(stage="Processing", progress=current_source_progress_base, message=f"Found {len(article_urls)} potential articles for {source.name}. Processing...")
                
                total_articles_in_source = len(article_urls)
                
                # --- NEW: Nested loop to process all articles from one source ---
                for j, url in enumerate(article_urls):
                    # Calculate fine-grained progress within the source's progress slice
                    article_progress_contribution = ((j + 1) / total_articles_in_source) * progress_per_source
                    total_progress = current_source_progress_base + article_progress_contribution
                    
                    if url in self.processed_urls or await self._is_duplicate(url):
                        yield FetchStatus(stage="Skipping", progress=total_progress, message=f"({j+1}/{total_articles_in_source}) Skipping duplicate: {url.split('/')[-1]}")
                        continue
                    
                    self.processed_urls.add(url)
                    
                    yield FetchStatus(
                        stage="Processing", 
                        progress=total_progress, 
                        message=f"({j+1}/{total_articles_in_source}) Processing article from {source.name}..."
                    )
                    
                    await self._process_article(url, source)

            except Exception as e:
                yield FetchStatus(stage="Error", progress=current_source_progress_base + progress_per_source, message=f"Failed to process {source.name}: {str(e)}")

        yield FetchStatus(stage="Complete", progress=100, message="News fetch loop finished.", is_complete=True)

    # --- NEW: Extracted logic for processing a single article ---
    async def _process_article(self, url: str, source: NewsSource):
        """Fetches, processes, and saves a single article."""
        response = await self.client.get(url)
        response.raise_for_status()

        content_text = trafilatura.extract(response.text, include_comments=False, include_tables=False)
        if not content_text or len(content_text) < 250:
            # Silently skip short/empty articles to not clutter logs
            return

        original_title = self._get_title(response.text) or "Untitled"
        ai_content = await self._get_ai_content(original_title, content_text)

        image_url = await self._handle_image(response.text, ai_content['title'], url)

        new_post = Post(
            title=ai_content['title'], summary=ai_content['summary'], description=ai_content['description'],
            image_url=image_url, source_name=source.name, source_url=url,
            published_date=datetime.utcnow(), author_id=self.superadmin.id
        )
        self.db.add(new_post)
        await self.db.commit()

    # --- MODIFIED: Renamed and updated to find multiple links ---
    async def _discover_all_links(self, source: NewsSource) -> List[str]:
        """For a given source, find all recent article links up to a limit."""
        links = []
        try:
            response = await self.client.get(source.url)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "").lower()
            
            # Case 1: XML Feed (RSS/Atom)
            if "xml" in content_type or "rss" in content_type:
                soup = BeautifulSoup(response.content, "lxml-xml")
                # Find all items and limit them
                items = soup.find_all("item", limit=self.max_links_per_source)
                for item in items:
                    if item.find("link"):
                        links.append(item.find("link").text.strip())
                return links
            
            # Case 2: Standard HTML Page
            elif "html" in content_type:
                soup = BeautifulSoup(response.content, "lxml")
                path_blacklist = {'/category/', '/tag/', '/author/', '/page/', '/search', '.pdf'}
                for a_tag in soup.find_all("a", href=True):
                    if len(links) >= self.max_links_per_source:
                        break # Stop once we've hit our limit
                    
                    href = a_tag.get('href')
                    if not href: continue
                    
                    full_url = urljoin(source.url, href)
                    parsed_url = urlparse(full_url)
                    
                    if (parsed_url.scheme not in ('http', 'https') or
                        parsed_url.netloc != urlparse(source.url).netloc or
                        parsed_url.fragment or
                        full_url == source.url or
                        any(blacklisted in parsed_url.path for blacklisted in path_blacklist) or
                        len(a_tag.get_text(strip=True).split()) < 5):
                        continue
                    
                    if full_url not in links:
                        links.append(full_url)
                return links

        except Exception as e:
            print(f"Could not discover links from {source.url}: {e}")
        return links

    async def _is_duplicate(self, url: str) -> bool:
        result = await self.db.execute(select(Post).where(Post.source_url == url))
        return result.scalar_one_or_none() is not None

    def _get_title(self, html: str) -> str:
        soup = BeautifulSoup(html, "lxml")
        if soup.title and soup.title.string:
            return soup.title.string
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"]
        return ""

    async def _get_ai_content(self, title: str, text: str) -> Dict[str, str]:
        if not settings.GOOGLE_API_KEY:
            return {"title": f"Summary of: {title}", "summary": text[:200] + "...", "description": text[:1000] + "..."}
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""Based *only* on the following article text, please perform these three tasks:
1. Create a new, concise, and factual headline.
2. Write a brief one-paragraph summary.
3. Write a detailed, multi-paragraph description.
Guidelines:
- The tone must be strictly neutral and informative.
- Do NOT add any interpretation, opinion, or information not present in the text.
- Base all output exclusively on the provided content.
- Format the output as a JSON object with three keys: "title", "summary", and "description".
Original Title: "{title}"
Article Text: --- {text[:8000]} ---"""
        try:
            response = await model.generate_content_async(prompt)
            json_text = response.text.strip().lstrip("```json").rstrip("```")
            return json.loads(json_text)
        except Exception as e:
            return {"title": f"AI Fallback: {title}", "summary": f"AI processing failed: {e}. " + text[:150] + "...", "description": text}
    
    async def _handle_image(self, html: str, title: str, base_url: str) -> str:
        soup = BeautifulSoup(html, 'lxml')
        og_image_tag = soup.find('meta', property='og:image')
        if og_image_tag and og_image_tag.get('content'):
            image_url = urljoin(base_url, og_image_tag['content'])
            try:
                response = await self.client.get(image_url)
                response.raise_for_status()
                return await self._save_image(response.content)
            except Exception as e:
                print(f"Failed to download og:image {image_url}: {e}")
        
        if settings.PEXELS_API_KEY:
            try:
                headers = {"Authorization": settings.PEXELS_API_KEY}
                params = {"query": title, "per_page": 1, "orientation": "landscape"}
                res = await self.client.get("https://api.pexels.com/v1/search", headers=headers, params=params)
                res.raise_for_status()
                data = res.json()
                if data.get("photos"):
                    pexels_url = data["photos"][0]["src"]["large"]
                    response = await self.client.get(pexels_url)
                    response.raise_for_status()
                    return await self._save_image(response.content)
            except Exception as e:
                print(f"Pexels search failed: {e}")

        return await self._create_placeholder_image(title)

    async def _save_image(self, image_bytes: bytes, max_width: int = 1200) -> str:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._process_and_save_image, image_bytes, max_width)

    def _process_and_save_image(self, image_bytes: bytes, max_width: int) -> str:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, "JPEG", quality=85, optimize=True)
        buffer.seek(0)
        
        filename = f"{uuid.uuid4()}.jpg"

        if self.r2_client and settings.R2_BUCKET_NAME and settings.R2_PUBLIC_URL:
            try:
                self.r2_client.upload_fileobj(
                    buffer,
                    settings.R2_BUCKET_NAME,
                    filename,
                    ExtraArgs={'ContentType': 'image/jpeg'}
                )
                print(f"Successfully uploaded {filename} to R2.")
                return f"{settings.R2_PUBLIC_URL}/{filename}"
            except Exception as e:
                print(f"Error uploading to R2: {e}. Falling back to local storage.")

        os.makedirs("static/images/posts", exist_ok=True)
        save_path = os.path.join("static", "images", "posts", filename)
        with open(save_path, "wb") as f:
            f.write(buffer.getvalue())
        return f"/static/images/posts/{filename}"

    async def _create_placeholder_image(self, text: str) -> str:
        loop = asyncio.get_running_loop()
        image_bytes = await loop.run_in_executor(None, self._generate_placeholder_bytes, text)
        return await self._save_image(image_bytes)

    def _generate_placeholder_bytes(self, text: str) -> bytes:
        width, height = 1200, 675
        img = Image.new('RGB', (width, height), color=(50, 50, 60))
        d = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 40)
        except IOError:
            font = ImageFont.load_default()

        words = text.split()
        lines = []
        current_line = ""
        for word in words:
            if d.textlength(current_line + word, font=font) <= width - 60:
                current_line += word + " "
            else:
                lines.append(current_line.strip())
                current_line = word + " "
        lines.append(current_line.strip())

        y_text = (height - len(lines) * 45) // 2
        for line in lines[:5]:
            text_width = d.textlength(line, font=font)
            d.text(((width - text_width) / 2, y_text), line, font=font, fill=(200, 200, 210))
            y_text += 45
        
        buffer = io.BytesIO()
        img.save(buffer, "JPEG")
        return buffer.getvalue()