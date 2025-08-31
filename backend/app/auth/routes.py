from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from pydantic import ValidationError

from app.api import deps
from app.core import security, config
from app.models.user import User, Role, Invitation
from app.schemas import token as token_schema, user as user_schema
from jose import jwt, JWTError

router = APIRouter()

@router.post("/login", response_model=token_schema.LoginResponse)
async def login(
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Handles user login, updates the last_login timestamp,
    and returns tokens along with the full user details to prevent race conditions.
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Update last_login timestamp
    user.last_login = datetime.utcnow()
    
    # Self-heal old records that might have null values for new fields
    if user.status_locked is None:
        user.status_locked = False
    
    db.add(user)
    await db.commit()
    await db.refresh(user)  # Refresh to get the latest state from the DB

    # Construct the response object with both token and user data
    return {
        "token": {
            "access_token": security.create_access_token(subject=user.id),
            "refresh_token": security.create_refresh_token(subject=user.id),
        },
        "user": user
    }

@router.post("/register", response_model=user_schema.UserPublic, status_code=status.HTTP_201_CREATED)
async def register_admin(
    admin_in: user_schema.AdminRegister,
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Public registration for new Admin users.
    """
    result = await db.execute(select(User).where(User.email == admin_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists.",
        )

    new_admin = User(
        email=admin_in.email,
        hashed_password=security.get_password_hash(admin_in.password),
        full_name=admin_in.full_name,
        company_name=admin_in.company_name,
        role=Role.ADMIN,
        is_active=True,
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return new_admin

@router.post("/refresh", response_model=token_schema.Token)
async def refresh_token(
    refresh_token: str = Form(...),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Refreshes an access token using a valid refresh token.
    """
    try:
        payload = jwt.decode(
            refresh_token, config.settings.SECRET_KEY, algorithms=[config.settings.ALGORITHM]
        )
        token_data = token_schema.TokenPayload(**payload)

        if datetime.fromtimestamp(payload['exp']) < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token has expired")

    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Issue new tokens (refresh rotation)
    return {
        "access_token": security.create_access_token(subject=user.id),
        "refresh_token": security.create_refresh_token(subject=user.id),
        "token_type": "bearer",
    }

@router.post("/accept-invite/{invite_token}")
async def accept_invite(
    invite_token: str,
    user_in: user_schema.UserAcceptInvite,
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Activates a user account by setting a password from an invitation token.
    """
    result = await db.execute(select(Invitation).where(Invitation.token == invite_token))
    invitation = result.scalar_one_or_none()

    if not invitation or invitation.is_used or invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token")

    result = await db.execute(select(User).where(User.email == invitation.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User for this invite not found")
        
    if user.hashed_password:
        raise HTTPException(status_code=400, detail="Account has already been activated.")

    user.hashed_password = security.get_password_hash(user_in.password)
    user.is_active = True
    invitation.is_used = True

    db.add(user)
    db.add(invitation)
    await db.commit()

    return {"message": "Account activated successfully. You can now log in."}