# Настройка dev-окружения

## Структура веток

```
main   → прод (kyharnya.vercel.app)     — только через PR из dev
dev    → стенд (kyharnya-dev.vercel.app) — сюда пушат разрабы
```

---

## Шаг 1 — Создать ветку dev

```bash
git checkout -b dev
git push origin dev
```

---

## Шаг 2 — Защитить ветку main в GitHub

GitHub → репо → **Settings → Branches → Add branch ruleset**:

- Branch name pattern: `main`
- ✅ Restrict deletions
- ✅ Require a pull request before merging
- ✅ Block force pushes

Теперь напрямую в `main` запушить нельзя — только через PR из `dev`.

---

## Шаг 3 — Создать новый Vercel проект для dev

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository → выбрать **тот же репо**
2. В настройках деплоя выбрать ветку **`dev`**
3. Имя проекта: `kyharnya-dev`

---

## Шаг 4 — Создать ресурсы для dev

Нужно создать отдельные аккаунты/проекты для изоляции от прода:

| Сервис | Что создать |
|--------|------------|
| Firebase | Новый проект `kyharnya-dev` (отдельная база данных) |
| Telegram | Новый бот через @BotFather (`@kyharnya_dev_bot`) |
| Cloudinary | Новый upload preset или отдельный аккаунт |

---

## Шаг 5 — Заполнить env vars в Vercel dev-проекте

Vercel → `kyharnya-dev` → **Settings → Environment Variables**

Заполни все переменные из `.env.example`, но с dev-значениями:

```
FIREBASE_API_KEY=           ← из dev Firebase проекта
FIREBASE_AUTH_DOMAIN=       ← из dev Firebase проекта
FIREBASE_DATABASE_URL=      ← из dev Firebase проекта (другой URL!)
FIREBASE_PROJECT_ID=        ← из dev Firebase проекта
FIREBASE_STORAGE_BUCKET=    ← из dev Firebase проекта
FIREBASE_MESSAGING_SENDER_ID= ← из dev Firebase проекта
FIREBASE_APP_ID=            ← из dev Firebase проекта
FIREBASE_CLIENT_EMAIL=      ← service account dev проекта
FIREBASE_PRIVATE_KEY=       ← service account dev проекта

BOT_TOKEN=                  ← токен dev-бота (@kyharnya_dev_bot)

CLOUDINARY_CLOUD_NAME=      ← dev cloudinary
CLOUDINARY_UPLOAD_PRESET=   ← dev cloudinary

ADMIN_PASSWORD_HASH=        ← можно тот же хэш или другой пароль
JWT_SECRET=                  ← новая случайная строка
CRON_SECRET=                ← новая случайная строка

CHEFS=ГИЗАР,ВИОЛЕТТА,КАМИЛЬ  ← или другие имена для теста
VOTE_THRESHOLD=2
PLAN_AHEAD_DAYS=7
```

---

## Шаг 6 — Зарегистрировать webhook dev-бота

После деплоя dev-стенда открыть в браузере:

```
https://kyharnya-dev.vercel.app/api/setwebhook?secret=SETUP
```

---

## Рабочий процесс

```bash
# Работаем в dev ветке
git checkout dev

# Делаем изменения, тестируем на стенде
git add .
git commit -m "feat: описание изменений"
git push origin dev
# → автодеплой на kyharnya-dev.vercel.app

# Проверили — всё работает → PR в прод
gh pr create --base main --head dev --title "feat: описание"
# или через GitHub UI: Pull requests → New pull request
# → после мержа автодеплой на kyharnya.vercel.app
```

---

## Генерация секретов (один раз)

```bash
# ADMIN_PASSWORD_HASH
node -e "require('bcryptjs').hash('твойпароль', 12).then(console.log)"

# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# CRON_SECRET
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```
