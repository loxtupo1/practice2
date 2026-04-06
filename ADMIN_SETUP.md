# Админ-панель - Инструкция по настройке

## Как создать администратора

### Вариант 1: Через консоль Firestore (быстро)

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект `labb-wwork`
3. Откройте **Firestore Database**
4. Перейдите в коллекцию **users**
5. Найдите документ с вашим **userId** (или создайте новый)
6. Добавьте/отредактируйте поле **role** → установите значение `admin`

### Пример документа пользователя:
```
{
  "email": "admin@example.com",
  "displayName": "Admin User",
  "role": "admin",
  "createdAt": "2026-02-24T10:00:00.000Z"
}
```

### Вариант 2: При регистрации (в коде)

В файле `src/components/Register.vue` измените строку:
```javascript
// Было:
role: 'user',

// Станет:
role: 'admin', // для создания админа
```

Потом измените обратно на `'user'` для обычных пользователей.

## Возможности Админ-панели

### 1. **Управление турнирами**
   - ➕ Создание новых турниров
   - 📝 Редактирование информации
   - 🗑️ Удаление турниров
   - 📊 Просмотр статистики

### 2. **Управление пользователями**
   - 👁️ Просмотр всех пользователей
   - 🗑️ Удаление пользователей

### 3. **Статистика**
   - 📈 Количество пользователей
   - 📈 Количество турниров
   - 📈 Количество регистраций
   - 💰 Общий призовой фонд

## Как открыть админ-панель

1. Зарегистрируйтесь/войдите в систему
2. Если у вас роль `admin`, в навигации появится ссылка **⚖️ Администратор**
3. Нажмите на неё для доступа к панели управления

## Структура Firestore

Админ-панель работает со следующими коллекциями:

### `/tournaments` - Турниры
```javascript
{
  name: "Tournament Name",
  game: "CS2",
  prizePool: 10000,
  maxTeams: 16,
  registeredTeams: 5,
  startDate: Timestamp,
  registrationDeadline: Timestamp,
  createdAt: Timestamp
}
```

### `/users` - Пользователи
```javascript
{
  email: "user@example.com",
  displayName: "User Name",
  role: "user" | "admin",
  createdAt: Timestamp
}
```

### `/registrations` - Регистрации на турниры
```javascript
{
  userId: "uid",
  tournamentId: "tournament_id",
  status: "pending" | "approved" | "rejected",
  registeredAt: Timestamp,
  teamName: "Team Name",
  players: []
}
```

## Будущие улучшения

- ✅ Редактирование турниров
- ✅ Изменение статуса регистраций
- ✅ Аналитика и отчёты
- ✅ Управление ролями пользователей
