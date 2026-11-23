"""Local interactive configuration for an approved Work & Job provider."""
import argparse
import asyncio
from getpass import getpass
import os
from pathlib import Path
import re
import tempfile

ROOT = Path(__file__).resolve().parent

def write_settings(values):
    destination = ROOT / ".env"
    lines = destination.read_text(encoding="utf-8-sig").splitlines() if destination.exists() else []
    for key, value in values.items():
        if not value or any(char in value for char in '"\r\n'):
            raise ValueError("Пустое или недопустимое значение для " + key)
    output = []
    for line in lines:
        match = re.match(r"^\s*(?:export\s+)?([\w]+)\s*=", line)
        if not match or match[1] not in values:
            output.append(line)
    output.extend(key + '="' + value + '"' for key, value in values.items())
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=ROOT, prefix=".env.", delete=False) as tmp:
        tmp.write("\n".join(output) + "\n")
    os.replace(tmp.name, destination)

async def telegram_settings():
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    api_id = str(int(input("API ID приложения Telegram: ").strip()))
    api_hash = getpass("API hash: ").strip()
    client = TelegramClient(StringSession(), int(api_id), api_hash)
    try:
        await client.start(phone=lambda:input("Телефон отдельного аккаунта Telegram: ").strip(),
                           code_callback=lambda:getpass("Код Telegram: ").strip(), password=lambda:getpass("Пароль 2FA: "))
        return {"ATLAS_TG_API_ID":api_id, "ATLAS_TG_API_HASH":api_hash, "ATLAS_TG_SESSION":client.session.save(),
                "ATLAS_TG_PYTHON":os.path.realpath(os.sys.executable)}
    finally:
        await client.disconnect()

def main():
    parser=argparse.ArgumentParser(description="Настройка источника в локальном .env Work & Job")
    parser.add_argument("source", choices=["hh","superjob","telegram"])
    source=parser.parse_args().source
    if source == "telegram":
        try:
            values=asyncio.run(telegram_settings())
        except ModuleNotFoundError:
            raise SystemExit('Установите зависимость: python -m pip install "telethon>=1.36,<2"')
    elif source == "hh":
        values={"HH_ACCESS_TOKEN":getpass("Токен приложения HH с согласованным доступом: ").strip(),
                "HH_USER_AGENT":input("User-Agent с названием приложения и контактным email: ").strip()}
    else:
        values={"SUPERJOB_APP_KEY":getpass("Секретный ключ зарегистрированного приложения SuperJob: ").strip()}
    write_settings(values)
    print("Настройки сохранены. Выполните .\\start-atlas.cmd restart")
if __name__=="__main__":
    main()
