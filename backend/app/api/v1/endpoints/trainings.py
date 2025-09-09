# filepath: backend/app/api/v1/endpoints/trainings.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid
import boto3
from botocore.client import Config
from pydantic import BaseModel

from app.api import deps
from app.models.user import User, Role
from app.models.training import Training, Module, Lesson, Attachment, UploadStatus
from app.schemas import training as training_schema
from app.core.config import settings

router = APIRouter()

# --- Helper data for attachment validation ---
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm",
    "application/pdf",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain", "application/zip"
}
MAX_SIZE_BYTES = settings.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024

# --- Pydantic models for specific requests ---
class FileMetadata(BaseModel):
    filename: str
    mime_type: str
    size: int

class GenerateUploadUrlsRequest(BaseModel):
    lesson_id: int
    files: List[FileMetadata]

class PresignedPostResponse(BaseModel):
    attachment_id: int
    upload_url: str
    filename: str

# NEW: Pydantic model for the publish status update request
class TrainingPublishUpdate(BaseModel):
    is_published: bool


# --- PUBLIC & MANAGEMENT LIST ROUTES ---

@router.get("/published", response_model=List[training_schema.TrainingListItem])
async def get_published_trainings(db: AsyncSession = Depends(deps.get_db)):
    """Get a simple list of all published trainings for navigation menus."""
    stmt = select(Training).where(Training.is_published == True).order_by(Training.title)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/my-trainings", response_model=List[training_schema.TrainingManagementListItem])
async def get_my_trainings(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Get a list of all trainings created by the current superadmin for management."""
    stmt = (
        select(Training)
        .where(Training.author_id == current_user.id)
        .order_by(Training.created_at.desc())
    )
    result = await db.execute(stmt)
    trainings = result.scalars().all()
    # Pydantic's model_validate handles the conversion correctly
    return [training_schema.TrainingManagementListItem.model_validate(t) for t in trainings]


# --- ATTACHMENT UPLOAD FLOW ROUTES ---

@router.post("/generate-upload-urls", response_model=List[PresignedPostResponse])
async def generate_upload_urls(
    request_data: GenerateUploadUrlsRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """
    Validates file metadata and generates pre-signed URLs for direct client-side upload to R2.
    Creates placeholder attachment records in the database.
    """
    if not all([settings.R2_ACCOUNT_ID, settings.R2_ACCESS_KEY_ID, settings.R2_SECRET_ACCESS_KEY, settings.R2_BUCKET_NAME]):
        raise HTTPException(status_code=501, detail="Cloudflare R2 is not configured on the server.")

    response_data: List[PresignedPostResponse] = []
    
    r2_client = boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )

    for file in request_data.files:
        if file.mime_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"File type '{file.mime_type}' for '{file.filename}' is not allowed.")
        if file.size > MAX_SIZE_BYTES:
            raise HTTPException(status_code=413, detail=f"File '{file.filename}' exceeds the max size of {settings.MAX_ATTACHMENT_SIZE_MB} MB.")

        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        storage_key = f"lessons/{request_data.lesson_id}/{uuid.uuid4()}.{file_extension}"
        
        new_attachment = Attachment(
            lesson_id=request_data.lesson_id,
            filename=file.filename,
            mime_type=file.mime_type,
            size=file.size,
            storage_key=storage_key,
            upload_status=UploadStatus.PENDING,
        )
        db.add(new_attachment)
        await db.flush() # Flush to get the new_attachment.id
        
        try:
            upload_url = r2_client.generate_presigned_url(
                "put_object",
                Params={"Bucket": settings.R2_BUCKET_NAME, "Key": storage_key, "ContentType": file.mime_type},
                ExpiresIn=3600 # 1 hour
            )
            response_data.append(PresignedPostResponse(
                attachment_id=new_attachment.id,
                upload_url=upload_url,
                filename=file.filename
            ))
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Could not generate upload URL for {file.filename}: {e}")

    await db.commit()
    return response_data

@router.post("/attachments/{attachment_id}/complete-upload", status_code=status.HTTP_200_OK)
async def complete_upload(
    attachment_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Marks an attachment's upload status as 'complete' after successful client-side upload."""
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    
    attachment.upload_status = UploadStatus.COMPLETE
    await db.commit()
    return {"message": "Upload marked as complete"}


# --- CORE CRUD ROUTES (CREATE, UPDATE, DELETE) ---

@router.post("/", response_model=training_schema.TrainingPublic, status_code=status.HTTP_201_CREATED)
async def create_training(
    training_in: training_schema.TrainingCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Create a new training."""
    new_training = Training(**training_in.model_dump(), author_id=current_user.id)
    db.add(new_training)
    await db.commit()
    # Manually construct Pydantic response to avoid lazy-loading 'modules'
    return training_schema.TrainingPublic(
        id=new_training.id,
        title=new_training.title,
        description=new_training.description,
        is_published=new_training.is_published,
        modules=[]
    )

@router.post("/{training_id}/modules", response_model=training_schema.ModulePublic)
async def add_module_to_training(
    training_id: int,
    module_in: training_schema.ModuleCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Add a new module to an existing training."""
    new_module = Module(**module_in.model_dump(), training_id=training_id)
    db.add(new_module)
    await db.commit()
    # Manually construct response to avoid lazy-loading 'lessons'
    return training_schema.ModulePublic(
        id=new_module.id,
        title=new_module.title,
        order=new_module.order,
        lessons=[]
    )

@router.post("/modules/{module_id}/lessons", response_model=training_schema.LessonPublic)
async def add_lesson_to_module(
    module_id: int,
    lesson_in: training_schema.LessonCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Add a new lesson to an existing module."""
    new_lesson = Lesson(**lesson_in.model_dump(), module_id=module_id)
    db.add(new_lesson)
    await db.commit()
    # Manually construct response to avoid lazy-loading 'attachments'
    return training_schema.LessonPublic(
        id=new_lesson.id,
        title=new_lesson.title,
        content=new_lesson.content,
        order=new_lesson.order,
        attachments=[]
    )

@router.put("/lessons/{lesson_id}", response_model=training_schema.LessonPublic)
async def update_lesson(
    lesson_id: int,
    lesson_in: training_schema.LessonCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Update a lesson's title and content."""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id).options(selectinload(Lesson.attachments)))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    lesson_data = lesson_in.model_dump(exclude_unset=True)
    for key, value in lesson_data.items():
        setattr(lesson, key, value)
        
    await db.commit()
    await db.refresh(lesson) # Refresh is safe here because we eager-loaded attachments
    return lesson

# --- NEW ENDPOINT TO TOGGLE PUBLISH STATUS ---
@router.put("/{training_id}/publish", response_model=training_schema.TrainingManagementListItem)
async def update_training_publish_status(
    training_id: int,
    publish_in: TrainingPublishUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Update the publish status of a training. (Superadmin only)"""
    result = await db.execute(
        select(Training).where(Training.id == training_id, Training.author_id == current_user.id)
    )
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found or you are not the author.")

    training.is_published = publish_in.is_published
    await db.commit()
    await db.refresh(training)
    
    return training

@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Deletes a single attachment record from the database and its corresponding file from R2."""
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found.")
        
    storage_key = attachment.storage_key
    
    if all([settings.R2_BUCKET_NAME, settings.R2_ACCOUNT_ID, settings.R2_ACCESS_KEY_ID]):
        try:
            r2_client = boto3.client(
                "s3",
                endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=Config(signature_version="s3v4"),
            )
            r2_client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=storage_key)
        except Exception as e:
            print(f"CRITICAL: Failed to delete R2 object {storage_key}. Error: {e}")
    
    await db.delete(attachment)
    await db.commit()
    return None

@router.delete("/{training_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_training(
    training_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """Deletes a training and all its contents (modules, lessons, attachments) and R2 objects."""
    stmt = (
        select(Training)
        .where(Training.id == training_id)
        .options(selectinload(Training.modules).selectinload(Module.lessons).selectinload(Lesson.attachments))
    )
    result = await db.execute(stmt)
    training = result.scalar_one_or_none()

    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")

    storage_keys_to_delete = [
        att.storage_key for mod in training.modules for les in mod.lessons for att in les.attachments if att.storage_key
    ]

    if storage_keys_to_delete and all([settings.R2_BUCKET_NAME, settings.R2_ACCOUNT_ID, settings.R2_ACCESS_KEY_ID, settings.R2_SECRET_ACCESS_KEY]):
        try:
            r2_client = boto3.client(
                "s3",
                endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=Config(signature_version="s3v4"),
            )
            # R2 can delete up to 1000 objects in one go
            keys_to_delete = [{"Key": key} for key in storage_keys_to_delete]
            r2_client.delete_objects(Bucket=settings.R2_BUCKET_NAME, Delete={"Objects": keys_to_delete})
        except Exception as e:
            # Log the error but continue with DB deletion
            print(f"CRITICAL: Failed to delete R2 objects for training {training_id}. Manual cleanup may be required. Error: {e}")

    await db.delete(training) # Cascade delete will handle modules, lessons, attachments
    await db.commit()
    return None


# --- GET DETAILS ROUTE (MUST BE LAST DYNAMIC ROUTE) ---

@router.get("/{training_id}", response_model=training_schema.TrainingPublic)
async def get_training_details(
    training_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get the full details of a training, including all modules, lessons, and attachments."""
    # Eager-load the entire object tree to prevent lazy-loading issues
    stmt = (
        select(Training)
        .where(Training.id == training_id)
        .options(
            selectinload(Training.modules)
            .selectinload(Module.lessons)
            .selectinload(Lesson.attachments)
        )
    )
    result = await db.execute(stmt)
    training = result.scalar_one_or_none()

    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")

    # Access control: only superadmins can view unpublished trainings
    if not training.is_published and current_user.role != Role.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this unpublished training.",
        )
    return training