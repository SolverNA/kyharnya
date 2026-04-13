# Настройка проекта

Полный гайд по разворачиванию Кухарни с нуля — сервисы, переменные, деплой.

---

## Содержание

1. [Требования](#требования)
2. [Firebase](#1-firebase)
3. [Telegram Bot](#2-telegram-bot)
4. [Cloudinary](#3-cloudinary)
5. [Vercel](#4-vercel)
6. [Переменные окружения](#5-переменные-окружения)
7. [Первый запуск](#6-первый-запуск)
8. [Dev-окружение](#7-dev-окружение)
9. [Генерация секретов](#генерация-секретов)

---

## Требования

- Node.js 18+
- Аккаунт [Vercel](https://vercel.com)
- Аккаунт [Firebase](https://firebase.google.com)
- Аккаунт [Cloudinary](https://cloudinary.com)
- Telegram аккаунт для создания бота

---

## 1. Firebase

### Создать проект

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Имя: `kyharnya` (или любое)
3. Google Analytics — по желанию

### Realtime Database

1. Build → **Realtime Database** → Create database
2. Локация: `europe-west1`
3. Режим: **Start in test mode** (потом настроим правила)

Правила безопасности (`Database → Rules`):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### Authentication

1. Build → **Authentication** → Get started
2. Sign-in method → **Google** → Enable
3. Добавь домен: `kyharnya.vercel.app` в Authorized domains

### Service Account (для серверной части)

1. Project Settings → **Service accounts**
2. **Generate new private key** → скачается JSON
3. Из него нужны: `client_email` и `private_key`

### Публичные ключи (для фронта)

Project Settings → Your apps → **Add app** → Web → получишь `firebaseConfig` объект.

---

## 2. Telegram Bot

1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` → задай имя и username (например `@kyharnya_bot`)
3. Сохрани токен — это `BOT_TOKEN`
4. `/setmenubutton` → задай кнопку открытия мини-аппа:
   - URL: `https://kyharnya.vercel.app`
   - Text: `🍳 Кухарня`

---

## 3. Cloudinary

1. [cloudinary.com](https://cloudinary.com) → Sign up → бесплатный план достаточен
2. Dashboard → скопируй **Cloud name**
3. Settings → **Upload** → **Add upload preset**:
   - Signing mode: **Unsigned**
   - Folder: `kyharnya`
   - Сохрани имя пресета — это `CLOUDINARY_UPLOAD_PRESET`

---

## 4. Vercel

### Деплой

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository
2. Выбери репо → **Deploy**
3. Framework Preset: **Other**

### Настройка домена

По умолчанию Vercel даст URL вида `kyharnya-xxx.vercel.app`. Можно переименовать в Project Settings.

---

## 5. Переменные окружения

Vercel → твой проект → **Settings → Environment Variables**

Добавь все переменные из `.env.example`. Вот что откуда брать:

```bash
# ── Firebase публичные (из firebaseConfig объекта) ──
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=kyharnya.firebaseapp.com
FIREBASE_DATABASE_URL=https://kyharnya-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_PROJECT_ID=kyharnya
FIREBASE_STORAGE_BUCKET=kyharnya.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=374992022938
FIREBASE_APP_ID=1:374992022938:web:...

# ── Firebase Admin (из скачанного service account JSON) ──
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@kyharnya.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ── Telegram ──
BOT_TOKEN=7123456789:AAF...

# ── Cloudinary ──
CLOUDINARY_CLOUD_NAME=dzgnizxuq
CLOUDINARY_UPLOAD_PRESET=kyharnya_unsigned

# ── Админка ──
ADMIN_PASSWORD_HASH=   # см. раздел "Генерация секретов"
JWT_SECRET=            # см. раздел "Генерация секретов"

# ── Cron ──
CRON_SECRET=           # см. раздел "Генерация секретов"

# ── Настройки приложения ──
CHEFS=ГИЗАР,ВИОЛЕТТА,КАМИЛЬ
VOTE_THRESHOLD=2
PLAN_AHEAD_DAYS=7
```

> ⚠️ `FIREBASE_PRIVATE_KEY` вставляй в кавычках — там внутри переносы строк (`\n`)

---

## 6. Первый запуск

После деплоя нужно зарегистрировать Telegram webhook:

```
https://kyharnya.vercel.app/api/setwebhook?secret=SETUP
```

Открой в браузере — должен вернуть `{"ok":true}`.

Проверь что бот живой: открой его в Telegram → `/start`

---

## 7. Dev-окружение

Для разработки используется отдельный Vercel проект на ветке `dev` с изолированными ресурсами.

### Создать ветку

```bash
git checkout -b dev
git push origin dev
```

### Защитить ветку main

GitHub → репо → **Settings → Branches → Add branch ruleset**:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Block force pushes

### Создать Vercel проект для dev

1. [vercel.com/new](https://vercel.com/new) → тот же репо → ветка **`dev`**
2. Имя проекта: `kyharnya-dev`
3. Заполнить env vars — те же поля, но с dev-значениями (отдельный Firebase проект, отдельный бот)

### Рабочий процесс

```bash
# Разрабатываем в dev
git checkout dev
git add . && git commit -m "feat: ..."
git push origin dev
# → автодеплой на kyharnya-dev.vercel.app

# Всё ок → PR в прод
gh pr create --base main --head dev --title "feat: ..."
# → мерж → автодеплой на kyharnya.vercel.app
```

---

## Генерация секретов

Все команды запускаются локально в терминале (нужен Node.js):

```bash
# ADMIN_PASSWORD_HASH — bcrypt хэш пароля для админки
node -e "require('bcryptjs').hash('твой_пароль', 12).then(console.log)"

# JWT_SECRET — подпись токенов
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# CRON_SECRET — защита /api/notify от внешних вызовов
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Сгенерированные значения вставляй напрямую в Vercel env vars — нигде не сохраняй.
