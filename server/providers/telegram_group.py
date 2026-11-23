"""Read vacancies from an explicitly configured public Telegram group."""
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone

from telethon import TelegramClient, types
from telethon.sessions import StringSession


async def read():
    username = sys.argv[1]
    allowed = os.environ.get("TELEGRAM_GROUPS", "").lower().split(",")
    if username not in [name.strip().lstrip("@") for name in allowed]:
        raise ValueError("Unconfigured group")
    client = TelegramClient(StringSession(os.environ["ATLAS_TG_SESSION"]),
                            int(os.environ["ATLAS_TG_API_ID"]), os.environ["ATLAS_TG_API_HASH"],
                            receive_updates=False, flood_sleep_threshold=0)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise ValueError("Session authorization required")
        group = await client.get_entity(username)
        if not isinstance(group, types.Channel) or not group.megagroup or (group.username or "").lower() != username:
            raise ValueError("Expected the configured public supergroup")
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        options = {"ids": [int(sys.argv[2])]} if len(sys.argv) == 3 else {}
        posts = []
        async for message in client.iter_messages(group, **options):
            if not message or not message.date:
                continue
            if message.date < cutoff:
                break
            if message.raw_text:
                posts.append({"id": message.id, "date": message.date.isoformat(), "text": message.raw_text})
        print(json.dumps(posts, ensure_ascii=True))
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(read())
