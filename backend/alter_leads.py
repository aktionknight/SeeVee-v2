import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def alter():
    engine = create_async_engine("postgresql+asyncpg://postgres:Simpi%40chiru1@localhost:5432/Seevee")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN is_qualified BOOLEAN DEFAULT TRUE"))
            print("Added is_qualified")
        except Exception as e:
            print("Error:", e)
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN disqualification_reason VARCHAR"))
            print("Added disqualification_reason")
        except Exception as e:
            print("Error:", e)

asyncio.run(alter())
