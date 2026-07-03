import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.encryption import decrypt_value

async def check():
    engine = create_async_engine("postgresql+asyncpg://postgres:Simpi%40chiru1@localhost:5432/Seevee")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, platform, encrypted_credentials FROM integrations WHERE user_id=1 AND platform='apify'"))
        rows = res.fetchall()
        print(f"Found {len(rows)} integrations.")
        for r in rows:
            print(f"ID: {r[0]}, Platform: {r[1]}, Decrypted Token: {decrypt_value(r[2])[:5]}...")

asyncio.run(check())
