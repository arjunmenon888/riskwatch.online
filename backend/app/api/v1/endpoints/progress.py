# filepath: backend/app/api/v1/endpoints/progress.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.user import User
from app.models.training import Training, Lesson, Module
from app.models.progress import UserLessonCompletion
from app.schemas import progress as progress_schema

router = APIRouter()

@router.get("/{training_id}", response_model=progress_schema.UserProgress)
async def get_user_progress(
    training_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get a user's progress for a specific training, including completed lessons
    and the ID of the next lesson they should resume.
    """
    # 1. Get all lesson IDs for this training
    training_stmt = (
        select(Training)
        .where(Training.id == training_id)
        .options(selectinload(Training.modules).selectinload(Module.lessons))
    )
    training_result = await db.execute(training_stmt)
    training = training_result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    all_lesson_ids = [
        lesson.id
        for module in training.modules
        for lesson in module.lessons
    ]
    if not all_lesson_ids:
        return progress_schema.UserProgress(completed_lesson_ids=[], next_lesson_id=None, total_lessons=0, completed_lessons_count=0)

    # 2. Get all of the user's completed lesson IDs for this training
    completion_stmt = select(UserLessonCompletion.lesson_id).where(
        UserLessonCompletion.user_id == current_user.id,
        UserLessonCompletion.training_id == training_id
    )
    completion_result = await db.execute(completion_stmt)
    completed_lesson_ids = completion_result.scalars().all()

    # 3. Determine the next lesson
    next_lesson_id = None
    for lesson_id in all_lesson_ids:
        if lesson_id not in completed_lesson_ids:
            next_lesson_id = lesson_id
            break

    return progress_schema.UserProgress(
        completed_lesson_ids=completed_lesson_ids,
        next_lesson_id=next_lesson_id,
        total_lessons=len(all_lesson_ids),
        completed_lessons_count=len(completed_lesson_ids)
    )

@router.post("/", status_code=status.HTTP_201_CREATED)
async def mark_lesson_as_complete(
    progress_in: progress_schema.ProgressCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Marks a lesson as complete for the current user."""
    # Find the lesson and its parent training
    lesson_stmt = (
        select(Lesson)
        .where(Lesson.id == progress_in.lesson_id)
        .options(selectinload(Lesson.module).selectinload(Module.training))
    )
    lesson_result = await db.execute(lesson_stmt)
    lesson = lesson_result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Check if a completion record already exists
    existing_completion_stmt = select(UserLessonCompletion).where(
        UserLessonCompletion.user_id == current_user.id,
        UserLessonCompletion.lesson_id == lesson.id
    )
    existing_completion = await db.execute(existing_completion_stmt)
    if existing_completion.scalar_one_or_none():
        return {"message": "Lesson already marked as complete."}
        
    completion = UserLessonCompletion(
        user_id=current_user.id,
        lesson_id=lesson.id,
        training_id=lesson.module.training.id
    )
    db.add(completion)
    await db.commit()
    return {"message": "Progress saved."}