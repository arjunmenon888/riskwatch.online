from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.user import User, Role, Post
from app.schemas import post as post_schema

router = APIRouter()

@router.get("/", response_model=List[post_schema.PostPublic])
async def get_all_posts(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get all news posts.
    """
    stmt = select(Post).order_by(Post.published_date.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    posts = result.scalars().all()
    return posts

@router.get("/{post_id}", response_model=post_schema.PostPublic)
async def get_post(
    post_id: int,
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Get a single post by its ID.
    """
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """
    Delete a post. (Superadmin only)
    """
    result = await db.execute(select(Post).where(Post.id == post_id))
    post_to_delete = result.scalar_one_or_none()
    if not post_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    await db.delete(post_to_delete)
    await db.commit()
    return None