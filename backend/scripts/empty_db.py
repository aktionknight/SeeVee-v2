import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load env before importing settings
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / ".env")

# Add backend directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import engine, Base
import app.models  # Import all models to ensure they are registered

async def empty_db():
    print("Connecting to database...")
    async with engine.begin() as conn:
        print("Dropping all tables to empty database contents...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Recreating tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database contents successfully emptied!")

if __name__ == "__main__":
    asyncio.run(empty_db())
