# «Атлас карьеры» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать fullstack MVP с реальной агрегацией вакансий, красивым адаптивным интерфейсом и честными статусами источников.

**Architecture:** Независимые provider-адаптеры возвращают единый `Vacancy`; Express параллельно агрегирует, фильтрует и кеширует результаты. React управляет поиском, сохранёнными записями и разделами, а нативные View Transitions и Motion обеспечивают доступные анимации.

**Tech Stack:** React, TypeScript, Vite, Express, tsx, Motion, Lucide, Cheerio, CSS.

**Spec:** `atlas-karery/docs/superpowers/specs/2026-11-23-atlas-career-design.md`

## Global Constraints

- Только IT, BIM/AEC, проектирование, дизайн и смежные технические роли в основной выдаче.
- Неизвестные поля остаются `null`; HTML источников не вставляется в DOM; фиктивный fallback запрещён.
- `source + externalId` — идентичность; URL и атрибуция источника обязательны.
- До 120 результатов, клиентские порции по 12; Telegram ведёт на конкретный пост.
- Ошибка одного провайдера не отменяет остальные результаты.
- Не создавать тестовую инфраструктуру в новом проекте без существующих тестов; проверять реальные API, build и браузерные сценарии.
- Не инициализировать git и не менять родительский проект.

## Review Focus

- Недоступный HH/timeout: частичный успех и видимый статус; проверить реальным запросом `/api/vacancies`.
- Непрофильные записи в общих лентах: исключить до выдачи; проверить title/category результатов.
- HTML/XSS в описании и Telegram: выводить только plain text; проверить специальные символы и отсутствие `dangerouslySetInnerHTML`.
- Повреждённый localStorage: безопасно вернуть пустой список; проверить в браузере.
- Мобильная карточка и drawer: focus/Esc/close и отсутствие overflow; проверить 390×844.

---

### Task 1: Каркас fullstack и контракты

**Files:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/types.ts`, `server/types.ts`, `server/index.ts`, `server/http.ts`, `src/main.tsx`

- [ ] Инициализировать React/Vite через artifact init в `atlas-karery`, добавить Express, tsx, Motion и Cheerio; неиспользуемые шаблонные UI-файлы удалить.
- [ ] Определить `Vacancy`, `SourceHealth`, `VacancyResponse`, `SearchFilters` и команды `dev`, `dev:server`, `build`, `start`.
- [ ] Реализовать timeout fetch, health endpoint и Vite proxy `/api` на `localhost:8787`.
- [ ] Запустить TypeScript build и health endpoint.

### Task 2: Provider-адаптеры и агрегация

**Files:** `server/providers/*.ts`, `server/normalize.ts`, `server/aggregate.ts`, `server/registry.ts`

**Interfaces:** `fetchVacancies(filters: SearchFilters): Promise<Vacancy[]>`, `getSources(): SourceHealth[]`, `aggregate(filters): Promise<VacancyResponse>`.

- [ ] Реализовать HH, Remotive, Remote OK и Arbeitnow с plain-text нормализацией, salary/location/work format и атрибуцией.
- [ ] Реализовать Greenhouse `discord`, Ashby `linear`, Lever `leverdemo` с явным `isDemo` для Leverdemo.
- [ ] Реализовать Telegram public previews `job_python`, `remoteit`, `jobjava`: Cheerio, конкретный post URL, только явные вакансии.
- [ ] Добавить классификацию профиля, фильтры, сортировку, dedupe, кеш, независимые ошибки и реестр ограниченных источников.
- [ ] Запросить `/api/vacancies`: подтвердить реальные записи минимум из пяти семейств, включая Telegram, и частичный успех при HH 403.

### Task 3: Поиск, фильтры, детальная карточка и сохранённые

**Files:** `src/App.tsx`, `src/hooks/useVacancies.ts`, `src/hooks/useSaved.ts`, `src/components/*.tsx`, `src/views/*.tsx`

- [ ] Реализовать загрузку, поиск с submit/debounce, фильтры, фасеты, сортировку, порции по 12 и честные loading/error/empty states.
- [ ] Реализовать список + desktop detail, mobile native dialog, внешний отклик, дату проверки, неизвестные значения и Telegram label.
- [ ] Реализовать saved в localStorage, раздел сохранённого, удаление, toast и восстановление после reload.
- [ ] Реализовать города Мюнхен/Дубай/Белград как реальные filter presets и источники со статусами.

### Task 4: Дизайн-система, анимации и доступность

**Files:** `src/styles/*.css`, `src/components/Header.tsx`, `src/components/FiltersDrawer.tsx`, `src/components/Transitions.tsx`

- [ ] Применить тёплый белый/ink/cobalt/coral, Onest, единые статусы, адаптивную master-detail компоновку.
- [ ] Добавить View Transitions с fallback для выбора карточек/разделов, Motion list/layout/exit transitions, stagger через `--sibling-index` с CSS `@supports` fallback.
- [ ] Добавить native dialog drawer, skip link, labels, focus-visible, polite live region, reduced motion и 44px touch targets.
- [ ] Проверить отсутствие `dangerouslySetInnerHTML`, overflow и лишних blocking popup.

### Task 5: Сквозная проверка

- [ ] Выполнить `npm run build` и lint; исправить ошибки в изменённом коде.
- [ ] Запустить API + Vite, проверить живые источники и фильтры реальными HTTP-запросами.
- [ ] Во встроенном браузере пройти поиск → выбор → внешняя ссылка → сохранение → reload → удаление.
- [ ] Проверить desktop 1440×900, mobile 390×844, reduced motion, dialog Esc/focus, источники и empty state.
- [ ] Проверить новые файлы, удалить только созданные ненужные логи/шаблоны и зафиксировать неподключённые ограничения.
