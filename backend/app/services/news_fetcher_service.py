import asyncio
import httpx
from bs4 import BeautifulSoup
import trafilatura
import google.generativeai as genai
from datetime import datetime
from typing import List, Dict, Any, AsyncGenerator
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
from app.schemas.post import FetchStatus

# Configure Google Gemini API
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

# Predefined sources
PREDEFINED_SOURCES = {
    "IOSH Magazine (RSS)": "https://www.ioshmagazine.com/rss-feed",
    "Health and Safety Executive (HTML)": "https://press.hse.gov.uk/news/",
    "Safety+Health Magazine (RSS)": "https://www.safetyandhealthmagazine.com/rss/articles",
}

class NewsFetcherService:
    """
    An asynchronous service to fetch, process, and save HSE news articles.
    Images are uploaded to Cloudflare R2.
    """

    def __init__(self, db: AsyncSession, limit: int, custom_sites: List[str], superadmin: User):
        self.db = db
        self.limit = limit
        self.custom_sites = custom_sites
        self.superadmin = superadmin
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
        # Stage 1: Discover Links
        yield FetchStatus(stage="Discovering links", progress=0, message="Starting link discovery...")
        all_sources = PREDEFINED_SOURCES.copy()
        for site in self.custom_sites:
            name = urlparse(site).netloc or f"Custom Site: {site}"
            all_sources[name] = site
        
        discovered_links = await self._discover_links(all_sources)
        yield FetchStatus(stage="Discovering links", progress=10, message=f"Found {len(discovered_links)} potential articles.")

        if not discovered_links:
            yield FetchStatus(stage="Complete", progress=100, message="No new articles found.", is_complete=True)
            return

        # Stages 2-5: Process each link
        total_links = len(discovered_links)
        for i, link_info in enumerate(discovered_links):
            progress_base = 10 + (i / total_links) * 85
            source_name = link_info['source_name']
            url = link_info['url']
            
            if url in self.processed_urls or await self._is_duplicate(url):
                yield FetchStatus(stage="Processing", progress=progress_base, message=f"Skipping duplicate: {url}")
                continue
            
            self.processed_urls.add(url)
            
            try:
                yield FetchStatus(stage="Fetching article pages", progress=progress_base, message=f"Fetching: {url}")
                response = await self.client.get(url)
                response.raise_for_status()

                yield FetchStatus(stage="Extracting content", progress=progress_base + (20/total_links), message="Extracting main content...")
                content_text = trafilatura.extract(response.text, include_comments=False, include_tables=False)
                
                if not content_text or len(content_text) < 250:
                    yield FetchStatus(stage="Extracting content", progress=progress_base + (20/total_links), message=f"Skipping short article (len: {len(content_text or '')}).")
                    continue
                
                yield FetchStatus(stage="Processing with AI", progress=progress_base + (40/total_links), message="Generating title and summary with AI...")
                original_title = self._get_title(response.text) or "Untitled"
                ai_content = await self._get_ai_content(original_title, content_text)

                yield FetchStatus(stage="Processing Image", progress=progress_base + (60/total_links), message="Finding and processing image...")
                image_url = await self._handle_image(response.text, ai_content['title'], url)

                yield FetchStatus(stage="Saving posts", progress=progress_base + (80/total_links), message="Saving post to database...")
                
                new_post = Post(
                    title=ai_content['title'],
                    summary=ai_content['summary'],
                    description=ai_content['description'],
                    image_url=image_url,
                    source_name=source_name,
                    source_url=url,
                    published_date=datetime.utcnow(),
                    author_id=self.superadmin.id
                )
                self.db.add(new_post)
                await self.db.commit()
                
                yield FetchStatus(stage="Saving posts", progress=progress_base + (85/total_links), message=f"Successfully saved: {new_post.title}")

            except Exception as e:
                yield FetchStatus(stage="Error", progress=progress_base, message=f"Failed to process {url}: {str(e)}")

        yield FetchStatus(stage="Complete", progress=100, message="News fetch process finished.", is_complete=True)

    # ... The _discover_links, _is_duplicate, _get_title, and _get_ai_content methods remain the same ...
    # (Copy them from the previous response if needed, no changes are required there)
    async def _discover_links(self, sources: Dict[str, str]) -> List[Dict[str, str]]:
        links = []
        for name, url in sources.items():
            try:
                response = await self.client.get(url)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").lower()
                
                if "xml" in content_type or "rss" in content_type:
                    soup = BeautifulSoup(response.content, "lxml-xml")
                    for item in soup.find_all("item"):
                        link_tag = item.find("link")
                        if link_tag and link_tag.text:
                            links.append({"url": link_tag.text.strip(), "source_name": name})
                elif "html" in content_type:
                    soup = BeautifulSoup(response.content, "lxml")
                    path_blacklist = {'/category/', '/tag/', '/author/', '/page/', '/search'}
                    for a_tag in soup.find_all("a", href=True):
                        href = a_tag.get('href')
                        if not href: continue
                        full_url = urljoin(url, href)
                        parsed_url = urlparse(full_url)
                        if (parsed_url.scheme not in ('http', 'https') or
                            parsed_url.netloc != urlparse(url).netloc or
                            parsed_url.fragment or
                            full_url == url or
                            any(blacklisted in parsed_url.path for blacklisted in path_blacklist) or
                            parsed_url.path.count('/') < 3 or
                            len(a_tag.get_text(strip=True).split()) < 5):
                            continue
                        links.append({"url": full_url, "source_name": name})
            except Exception as e:
                print(f"Could not discover links from {url}: {e}")
        unique_links = [dict(t) for t in {tuple(d.items()) for d in links}]
        return unique_links[:self.limit]

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
    
    # --- MODIFIED IMAGE HANDLING LOGIC ---

    async def _handle_image(self, html: str, title: str, base_url: str) -> str:
        # 1. Try to find og:image
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
        
        # 2. Try Pexels API
        if settings.PEXELS_API_KEY:
            try:
                # Use httpx for consistency
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

        # 3. Fallback to placeholder
        return await self._create_placeholder_image(title)

    async def _save_image(self, image_bytes: bytes, max_width: int = 1200) -> str:
        loop = asyncio.get_running_loop()
        # This now calls the unified image processing function
        return await loop.run_in_executor(None, self._process_and_save_image, image_bytes, max_width)

    def _process_and_save_image(self, image_bytes: bytes, max_width: int) -> str:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, "JPEG", quality=85, optimize=True)
        buffer.seek(0) # Reset buffer position to the beginning
        
        filename = f"{uuid.uuid4()}.jpg"

        # If R2 is configured, upload there. Otherwise, save locally.
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

        # Fallback to local storage
        os.makedirs("static/images/posts", exist_ok=True)
        save_path = os.path.join("static", "images", "posts", filename)
        with open(save_path, "wb") as f:
            f.write(buffer.getvalue())
        return f"/static/images/posts/{filename}"


    async def _create_placeholder_image(self, text: str) -> str:
        loop = asyncio.get_running_loop()
        # Create image bytes in memory first
        image_bytes = await loop.run_in_executor(None, self._generate_placeholder_bytes, text)
        # Then save/upload those bytes
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