# 🪟 Nail Studio — Telegram Mini App

Полная инструкция по запуску **сегодня**, бесплатно.

---

## Структура проекта

```
nail-bot/
├── backend/          ← Node.js сервер (Express + SQLite)
│   ├── server.js
│   └── package.json
└── frontend/         ← React приложение (Vite)
    ├── src/App.jsx
    ├── index.html
    └── package.json
```

---

## Шаг 1 — Создать Telegram бота

1. Написать **@BotFather** в Telegram
2. `/newbot` → придумать имя → получить **BOT_TOKEN** (вида `123456:ABC...`)
3. `/newapp` → выбрать бота → загрузить иконку (640x360 png) → написать URL (пока `https://example.com`, потом заменим)

---

## Шаг 2 — Задеплоить backend на Render.com

1. Зарегистрироваться на [render.com](https://render.com) (бесплатно)
2. Залить папку `backend/` на GitHub (новый репозиторий)
3. На Render: **New → Web Service** → выбрать репо
4. Настройки:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:**
     ```
     BOT_TOKEN=ваш_токен_от_BotFather
     ADMIN_PASSWORD=придумайте_пароль_мастера
     PORT=3001
     ```
5. Нажать **Deploy** → подождать 2-3 минуты
6. Сохранить URL вида `https://nail-bot-xxx.onrender.com`

> ⚠️ Бесплатный Render "засыпает" через 15 мин без запросов.  
> Первый запрос после сна занимает ~30 сек. Для продакшена — взять платный план ($7/мес).

---

## Шаг 3 — Задеплоить frontend

### Вариант A — Netlify (проще всего)

1. В папке `frontend/` создать файл `.env`:
   ```
   VITE_API_URL=https://nail-bot-xxx.onrender.com
   ```
2. Залить папку `frontend/` на GitHub
3. Зарегистрироваться на [netlify.com](https://netlify.com) → **Import from Git**
4. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Environment variable:** `VITE_API_URL=https://nail-bot-xxx.onrender.com`
5. Deploy → получить URL вида `https://nail-studio-xxx.netlify.app`

### Вариант B — Vercel

1. Установить Vercel CLI: `npm i -g vercel`
2. В папке `frontend/`: `vercel deploy`
3. Указать переменную `VITE_API_URL` в настройках проекта

---

## Шаг 4 — Подключить Mini App к боту

1. Написать **@BotFather**
2. `/mybots` → выбрать бота → **Bot Settings → Menu Button → Configure menu button**
3. Вставить URL фронтенда: `https://nail-studio-xxx.netlify.app`

Или добавить кнопку в меню:
```
/setmenubutton
```

---

## Шаг 5 — Проверить

1. Открыть бота в Telegram
2. Нажать кнопку меню (появится кнопка "Open App")
3. Проверить бронирование клиентом
4. Нажать "для мастеров" → ввести пароль из `ADMIN_PASSWORD`
5. Убедиться что записи видны в панели

---

## Локальный запуск (для тестирования)

### Backend
```bash
cd backend
npm install
BOT_TOKEN=test ADMIN_PASSWORD=test123 SKIP_TG_VALIDATION=true node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Открыть http://localhost:5173
```

---

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка сервера |
| GET | `/api/bookings` | Все записи (для админа) |
| GET | `/api/bookings/my?tg=@user` | Записи клиента |
| GET | `/api/bookings/slots?masterId=1&dateStr=2025-01-25` | Свободные слоты |
| POST | `/api/bookings` | Создать запись |
| PATCH | `/api/bookings/:id/status` | Изменить статус (для мастера) |
| PATCH | `/api/bookings/:id/cancel` | Отменить запись (клиент) |
| GET | `/api/flags` | Флаги клиентов |
| PUT | `/api/flags/:tgId` | Обновить флаг клиента |
| GET | `/api/closed-days` | Закрытые дни |
| POST | `/api/closed-days` | Закрыть день |
| DELETE | `/api/closed-days/:dateKey` | Открыть день |
| POST | `/api/admin/login` | Войти как мастер |

---

## Пароль мастера по умолчанию

Если `ADMIN_PASSWORD` не задан в env — используется `nail2024`.  
**Обязательно** задайте свой пароль через переменную окружения!

---

## База данных

SQLite файл создаётся автоматически в `backend/data/nail.db`.  
На Render.com данные **сохраняются между деплоями** (persistent disk).

> Для бэкапа: скачайте файл `nail.db` или настройте экспорт в Google Sheets через n8n/Make.

---

## Что делать дальше

- [ ] Подключить уведомления через Bot API (`telegram.sendMessage`)
- [ ] Добавить оплату через Telegram Payments
- [ ] Настроить напоминания за 1 час до визита
- [ ] Добавить отзывы после визита
