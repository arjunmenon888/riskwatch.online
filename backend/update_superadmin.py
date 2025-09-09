import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.db import base  # noqa - Crucial for model registration
from app.core.config import settings
from app.core.security import get_password_hash

async def update_superadmin_password():
    """
    Finds the superadmin user and updates their password to match the
    current FIRST_SUPERADMIN_PASSWORD environment variable.
    """
    print("Attempting to update superadmin password...")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == settings.FIRST_SUPERADMIN_EMAIL)
        )
        superadmin = result.scalar_one_or_none()

        if superadmin:
            print(f"Found superadmin: {superadmin.email}. Updating password...")
            
            new_hashed_password = get_password_hash(settings.FIRST_SUPERADMIN_PASSWORD)
            superadmin.hashed_password = new_hashed_password
            
            db.add(superadmin)
            await db.commit()
            
            print("Password updated successfully.")
        else:
            print(f"ERROR: Superadmin with email '{settings.FIRST_SUPERADMIN_EMAIL}' not found in the database.")
            print("Please run the seed.py script first to create the user.")

if __name__ == "__main__":
    print("Starting superadmin password update process...")
    asyncio.run(update_superadmin_password())
    print("Password update process finished.")