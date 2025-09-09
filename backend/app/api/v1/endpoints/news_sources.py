# filepath: backend/app/api/v1/endpoints/news_sources.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from urllib.parse import urlparse

from app.api import deps
from app.models.user import User, Role
from app.models.news import NewsSource
from app.schemas import news as news_schema

router = APIRouter()

@router.get("/", response_model=List[news_schema.NewsSourcePublic])
async def get_all_news_sources(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Retrieve all saved news sources."""
    result = await db.execute(select(NewsSource).order_by(NewsSource.name))
    return result.scalars().all()

@router.post("/", response_model=news_schema.NewsSourcePublic, status_code=status.HTTP_201_CREATED)
async def create_news_source(
    source_in: news_schema.NewsSourceCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Add a new news source."""
    result = await db.execute(select(NewsSource).where(NewsSource.url == str(source_in.url)))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This URL has already been added as a source.")

    name = source_in.name or urlparse(str(source_in.url)).netloc
    
    new_source = NewsSource(
        name=name,
        url=str(source_in.url),
        author_id=current_user.id
    )
    db.add(new_source)
    await db.commit()
    await db.refresh(new_source)
    return new_source

@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_news_source(
    source_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Delete a news source."""
    result = await db.execute(select(NewsSource).where(NewsSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    await db.delete(source)
    await db.commit()
    return None