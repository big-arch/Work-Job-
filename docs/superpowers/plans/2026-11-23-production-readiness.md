# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить существующий «Атлас карьеры» к безопасному запуску с реальными ключами и к публикации через Docker.

**Architecture:** Сохраняем текущие адаптеры, но выносим ключи, идентификаторы boards и Telegram-каналы в env. Node/Express по-прежнему отдаёт клиент и API; Docker multi-stage build собирает frontend и запускает один процесс с volume для кеша.

**Tech Stack:** TypeScript, Express, Vite, pnpm, Docker.

**Spec:** `atlas-karery/docs/superpowers/specs/2026-11-23-atlas-career-design.md` плюс этот production scope.

## Global Constraints

- Не записывать реальные ключи в код, `.env.example`, логи или документацию.
- Отсутствие env не должно ломать существующие бесплатные источники.
- HH использует `HH_ACCESS_TOKEN` только при наличии; никаких токенов из n8n.
- Не создавать тестовую инфраструктуру; проверка через build и production HTTP smoke.
- Не выполнять git-мутации и не создавать внешние аккаунты.

## Review Focus

- Пустой `HH_ACCESS_TOKEN` не добавляет Authorization; непустой добавляет без логирования.
- Пустые списки ATS/Telegram не создают ложных подключений или ошибок парсинга.
- Docker build не содержит node_modules/data/secrets из host.
- Production `/`, `/api/health`, `/api/vacancies` отвечают на одном origin.

---

### Task 1: Безопасная конфигурация источников

**Files:** `server/providers/boards.ts`, `server/providers/ats.ts`, `server/providers/telegram.ts`, `server/config.ts`, `.env.example`

- [ ] Создать `server/config.ts`: чтение `HH_ACCESS_TOKEN`, `HH_USER_AGENT`, `GREENHOUSE_BOARDS`, `ASHBY_BOARDS`, `LEVER_BOARDS`, `TELEGRAM_CHANNELS` с безопасными defaults текущего MVP.
- [ ] HH добавляет Bearer только при непустом token; user agent остаётся настраиваемым.
- [ ] ATS принимает списки `provider:board` или board с именем компании из существующего адаптера; сохранить текущие Discord/Linear/Leverdemo.
- [ ] Telegram принимает список usernames, сохраняет текущие три канала и конкретные post URL.
- [ ] Создать `.env.example` только с пустыми значениями и комментариями формата.
- [ ] Проверить TypeScript build и отсутствие реальных секретов через поиск по изменённым файлам.

### Task 2: Docker и инструкции публикации

**Files:** `Dockerfile`, `.dockerignore`, `compose.yaml`, `README.md`

- [ ] Multi-stage Dockerfile: Node 22, pnpm через corepack, install, build, production runtime с только нужными файлами и `PORT=8787`.
- [ ] `.dockerignore` исключает node_modules, dist, data, .env*, .superpowers и docs.
- [ ] Compose пробрасывает `8787`, монтирует `atlas-data` в `/app/data`, принимает env без хранения ключей.
- [ ] Обновить существующий README: dev, production, Docker, таблица env, n8n security checklist, источники, ограничения.
- [ ] Проверить `docker --version`; если daemon недоступен, не имитировать image build.

### Task 3: Production verification

- [ ] Выполнить `pnpm build` и `pnpm lint`.
- [ ] Запустить production на отдельном порту и проверить `/`, `/api/health`, `/api/vacancies` реальными HTTP-запросами.
- [ ] Проверить новые файлы и отсутствие секретов/ненужных временных файлов.
