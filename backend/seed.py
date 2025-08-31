import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.user import User, Role
from app.core.config import settings
from app.core.security import get_password_hash

async def seed_superadmin():
    """
    Creates the initial Superadmin user in the database if it doesn't exist,
    ensuring all required fields are populated.
    """
    print("Attempting to seed superadmin...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == settings.FIRST_SUPERADMIN_EMAIL)
        )
        existing_superadmin = result.scalar_one_or_none()

        if not existing_superadmin:
            print(f"Superadmin user '{settings.FIRST_SUPERADMIN_EMAIL}' not found. Creating...")
            
            # --- THIS IS THE CORRECTED OBJECT CREATION ---
            new_superadmin = User(
                email=settings.FIRST_SUPERADMIN_EMAIL,
                hashed_password=get_password_hash(settings.FIRST_SUPERADMIN_PASSWORD),
                role=Role.SUPERADMIN,
                is_active=True,
                # Provide defaults for all new non-nullable fields
                full_name="Super Admin",
                company_name="RiskWatch Inc.",
                can_create_users=True,
                user_creation_limit=-1, # -1 can signify unlimited for superadmin
                status_locked=False # Explicitly set to False
            )
            
            db.add(new_superadmin)
            await db.commit()
            
            print("Superadmin user created successfully.")
        else:
            print("Superadmin user already exists. Skipping creation.")

if __name__ == "__main__":
    print("Starting database seed process...")
    asyncio.run(seed_superadmin())
    print("Database seed process finished.")