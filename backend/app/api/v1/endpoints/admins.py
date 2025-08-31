from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.security import get_password_hash
from app.models.user import User, Role
from app.schemas import user as user_schema

router = APIRouter()

@router.get("/admins", response_model=List[user_schema.UserPublic])
async def get_admins(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """
    Get all Admin users, ensuring all fields and created_user counts are included.
    (Superadmin only)
    """
    # The .options(selectinload(User.created_users)) is the key to efficiently
    # loading the related 'created_users' for counting in a separate query,
    # preventing the N+1 problem.
    stmt = (
        select(User)
        .where(User.role == Role.ADMIN)
        .options(selectinload(User.created_users))
    )
    result = await db.execute(stmt)
    
    # We use unique() to ensure each admin appears once after the loading strategy.
    admins = result.scalars().unique().all()
    
    # Manually construct the response to guarantee all fields are present
    response_data = []
    for admin in admins:
        # Pydantic's model_validate will correctly pull all attributes from the
        # loaded 'admin' SQLAlchemy object, including last_login.
        admin_dto = user_schema.UserPublic.model_validate(admin)
        admin_dto.users_created_count = len(admin.created_users)
        response_data.append(admin_dto)
        
    return response_data

@router.post("/admins", response_model=user_schema.UserPublic, status_code=status.HTTP_201_CREATED)
async def create_admin(
    admin_in: user_schema.AdminCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """
    Create a new Admin user. (Superadmin only)
    Note: This is an alternative to public registration.
    """
    result = await db.execute(select(User).where(User.email == admin_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    new_admin = User(
        email=admin_in.email,
        hashed_password=get_password_hash(admin_in.password),
        role=Role.ADMIN,
        is_active=True,
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return new_admin

@router.put("/admins/{admin_id}/settings", response_model=user_schema.UserPublic)
async def update_admin_settings(
    admin_id: int,
    settings_in: user_schema.AdminSettingsUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    result = await db.execute(select(User).where(User.id == admin_id, User.role == Role.ADMIN))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    old_limit = admin.user_creation_limit
    new_limit = settings_in.user_creation_limit

    admin.can_create_users = settings_in.can_create_users
    admin.user_creation_limit = new_limit
    
    # --- ENHANCED DEACTIVATION/REACTIVATION LOGIC ---
    
    # Get all users created by this admin
    users_created_result = await db.execute(
        select(User).where(User.created_by_id == admin_id)
    )
    all_created_users = users_created_result.scalars().all()
    
    active_users = [u for u in all_created_users if u.is_active]
    inactive_locked_users = [u for u in all_created_users if not u.is_active and u.status_locked]
    
    # Scenario 1: Limit was reduced, deactivate newest users
    if len(active_users) > new_limit:
        num_to_deactivate = len(active_users) - new_limit
        # Sort active users by creation date, newest first
        active_users.sort(key=lambda u: u.created_at, reverse=True)
        users_to_deactivate = active_users[:num_to_deactivate]
        for user in users_to_deactivate:
            user.is_active = False
            user.status_locked = True # Lock their status

    # Scenario 2: Limit was increased, unlock oldest locked users
    elif len(active_users) < new_limit:
        num_to_unlock = new_limit - len(active_users)
        # Sort inactive locked users by creation date, oldest first
        inactive_locked_users.sort(key=lambda u: u.created_at)
        users_to_unlock = inactive_locked_users[:num_to_unlock]
        for user in users_to_unlock:
            user.status_locked = False # Unlock, but do not reactivate

    await db.commit()
    await db.refresh(admin)
    return admin

@router.delete("/admins/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin(
    admin_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.SUPERADMIN])),
):
    """
    Delete an admin and all users they have created (due to cascade).
    (Superadmin only)
    """
    result = await db.execute(select(User).where(User.id == admin_id, User.role == Role.ADMIN))
    admin_to_delete = result.scalar_one_or_none()
    if not admin_to_delete:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # This single line triggers the cascade delete in the database
    await db.delete(admin_to_delete)
    await db.commit()
    return None