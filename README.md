# Work & Job

**[Открыть сайт](https://big-arch.github.io/Work-Job-/)** · [Поиск BIM](https://big-arch.github.io/Work-Job-/?q=BIM) · [Источники](https://big-arch.github.io/Work-Job-/#sources)

Публичный сайт доступен по HTTPS с компьютера и телефона. GitHub Actions собирает интерфейс и перепроверяет открытые ленты каждые два часа. GitHub может задерживать запуски. Снимки старше 48 часов исключаются из выдачи. Для произвольного запроса браузер обращается к публичным доскам SmartRecruiters и получает полное описание выбранной вакансии. Для Telegram и RSS показано время обновления ленты. Источники с ключами доступны в отдельно развёрнутой серверной версии.

## Публикация

Процесс `.github/workflows/pages.yml` запускается при отправке в main, вручную и по расписанию. В Settings → Pages источником служит GitHub Actions. Собранная лента передаётся в артефакте Pages. Серверные ключи и пользовательские сессии храните в локальном `.env`.



Fullstack MVP поиска вакансий для BIM/AEC, IT и дизайна. React + TypeScript + Vite на клиенте, Express на сервере.

## Запуск разработки

```bash
pnpm install
pnpm dev
```

Vite открывает клиент на `http://127.0.0.1:5173`, API работает на `http://127.0.0.1:8787` и проксируется через `/api`.

## Production без Docker

```bash
pnpm install
pnpm build
PORT=8788 pnpm start
```

Откройте `http://127.0.0.1:8788`. Один Express-процесс отдаёт собранный клиент и API.

## Docker

```bash
docker build -t atlas-career .
docker run --env-file .env -p 8787:8787 -v atlas-data:/app/data atlas-career
```

Или через Compose:

```bash
docker compose up --build
```

Приложение будет доступно на `http://localhost:8787`. Healthcheck использует `/api/health`; кеш сохраняется в volume `atlas-data`.

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните только нужные значения. Файл `.env` исключён из Git и Docker context.

| Переменная | Назначение | Значение по умолчанию |
|---|---|---|
| `HH_ACCESS_TOKEN` | OAuth Bearer-токен HH; пусто — запрос без Authorization | пусто |
| `HH_USER_AGENT` | Идентификатор приложения и контакт для HH | локальный идентификатор |
| `GREENHOUSE_BOARDS` | Public board IDs через запятую | `discord` |
| `ASHBY_BOARDS` | Public board IDs через запятую | `linear` |
| `LEVER_BOARDS` | Public board IDs через запятую | `leverdemo` |
| `TELEGRAM_CHANNELS` | Публичные usernames без `@` | `job_python,remoteit,jobjava` |

Никогда не помещайте в списки board IDs пароли, токены, cookie или URL с секретами.

## Проверки

```bash
pnpm build
pnpm lint
```

Перед публикацией дополнительно проверьте на production-origin:

- `/` отдаёт интерфейс;
- `/api/health` возвращает `ok: true`;
- `/api/vacancies` возвращает реальные записи или честные ошибки источников;
- поиск, фильтры, сохранение и внешние ссылки работают на desktop и mobile.

## Источники

Реализованы независимые адаптеры: HH, Remotive, Remote OK, Arbeitnow, Jobicy, We Work Remotely, Greenhouse, Ashby, Lever и публичные Telegram-каналы.

- Ошибка одного источника не мешает остальным.
- Успешные ответы кешируются в `data/provider-cache.json`.
- Для Telegram при недоступности `t.me` используется явно подписанный снимок реальных постов со ссылкой на канал.
- Leverdemo помечается как демонстрационный источник.
- LinkedIn, Indeed и Habr Career требуют официального доступа и не имитируются.
- Закрытые Telegram-каналы требуют Bot API и прав администратора канала.

Условия зарплаты, переезда, визы и локации не додумываются. Описания выводятся только как plain text, сохранённые вакансии валидируются через Zod и остаются в localStorage браузера.

## n8n и безопасность

Для существующего workflow `Parsing HH` перед запуском:

- перенести Bearer-токены и Telegram Bot Token в n8n Credentials;
- перевыпустить токены, которые попадали в логи, экспорт или общий доступ;
- убрать резюме и персональные контакты из общего workflow;
- сначала тестировать только HH HTTP Request, не запуская Airtable, Telegram и LLM;
- для LLM включить JSON Schema/Structured Output и обработку невалидного JSON;
- не публиковать `company_score` без источников, дат, количества отзывов и уровня уверенности.
