from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User, Role, Invitation
from app.schemas import user as user_schema

router = APIRouter()

@router.post("/users/invite", response_model=user_schema.InvitationPublic)
async def invite_user(
    invitation_in: user_schema.InvitationCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.ADMIN])),
):
    """
    Create an invitation for a new user. (Admin only)
    The invitation generates a token and creates a placeholder user record.
    """
    result = await db.execute(select(User).where(User.email == invitation_in.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if invitation_in.role != Role.USER:
        raise HTTPException(status_code=403, detail="Admins can only invite users with the 'user' role.")

    # 1. Create the placeholder user
    new_user = User(
        email=invitation_in.email,
        full_name=invitation_in.full_name,
        role=invitation_in.role,
        is_active=False,
        created_by_id=current_user.id
    )
    db.add(new_user)
    await db.flush()

    # 2. Create the invitation record
    invite_token = security.generate_invite_token()
    expires_at = datetime.utcnow() + timedelta(hours=settings.INVITE_TOKEN_EXPIRE_HOURS)
    
    invitation = Invitation(
        email=invitation_in.email,
        token=invite_token,
        expires_at=expires_at,
        created_by_id=current_user.id
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    
    return invitation

@router.get("/users/me", response_model=user_schema.UserPublic)
async def read_users_me(current_user: User = Depends(deps.get_current_user)):
    """
    Get current user's details.
    """
    return current_user

@router.get("/users", response_model=List[user_schema.UserPublic])
async def get_created_users(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.ADMIN])),
):
    """
    # Fetch all users and their pending (is_used=False) invitations
    """
    result = await db.execute(
        select(User)
        .outerjoin(Invitation, (User.email == Invitation.email) & (Invitation.is_used == False))
        .where(User.role == Role.USER, User.created_by_id == current_user.id)
        .with_only_columns(User, Invitation.token)
    )
    users_data = []
    for user, token in result.all():
        user_dto = user_schema.UserPublic.model_validate(user)
        user_dto.pending_invite_token = token
        users_data.append(user_dto)
        
    return users_data

@router.put("/users/{user_id}/status", response_model=user_schema.UserPublic)
async def update_user_status(
    user_id: int,
    user_update: user_schema.AdminUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.ADMIN])),
):
    result = await db.execute(select(User).where(User.id == user_id, User.role == Role.USER))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # --- NEW CHECK ---
    if user.status_locked:
        raise HTTPException(
            status_code=403,
            detail="This user's status is locked by the Superadmin due to quota limits."
        )
    # --- END OF NEW CHECK ---

    user.is_active = user_update.is_active
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

# --- MODIFIED FUNCTION ---
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([Role.ADMIN])),
):
    """
    Delete a user and their corresponding invitation. (Admin only)
    """
    # Find the user to delete
    result = await db.execute(select(User).where(User.id == user_id, User.role == Role.USER))
    user_to_delete = result.scalar_one_or_none()

    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_email = user_to_delete.email

    # Delete the user record. If cascading is set up, this might be redundant,
    # but being explicit is safer.
    await db.delete(user_to_delete)
    
    # Explicitly delete any pending invitations for that email to prevent unique constraint errors.
    delete_invitation_stmt = delete(Invitation).where(Invitation.email == user_email)
    await db.execute(delete_invitation_stmt)
    
    await db.commit()
    return None