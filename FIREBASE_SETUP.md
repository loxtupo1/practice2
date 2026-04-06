# Документация Firebase Security Rules и DB Schema

## 1. Структура базы данных (Schema)

### 1.1 Коллекция: `users`
Хранит информацию о пользователях системы.

**Документ структура:**
```
users/{userId}
├── uid (string) - уникальный ID пользователя
├── email (string) - email пользователя
├── displayName (string) - отображаемое имя
├── role (string) - роль ("user" или "admin")
├── createdAt (timestamp) - дата создания аккаунта
├── avatarUrl (string, optional) - URL аватара из Firebase Storage
└── premium (boolean) - статус премиум подписки
```

**Пример документа:**
```json
{
  "uid": "user123abc",
  "email": "player@example.com",
  "displayName": "ProGamer",
  "role": "user",
  "createdAt": "2026-02-24T10:30:00Z",
  "avatar": "https://...",
  "premium": false
}
```

---

### 1.2 Коллекция: `tournaments`
Основные сущности - киберспортивные турниры.

**Документ структура:**
```
tournaments/{tournamentId}
├── name (string) - название турнира
├── game (string) - игра (CS2, DOTA2, VALORANT, Обезьянка)
├── description (string) - описание турнира
├── prizePool (number) - размер призового фонда ($)
├── maxTeams (number) - максимальное кол-во команд
├── registeredTeams (number) - текущее кол-во зарегистрированных команд
├── format (string) - формат (BO1, BO3, BO5 и т.д.)
├── level (string) - уровень (Любительский, Профессиональный)
├── region (string) - регион (Online, Europe, Asia и т.д.)
├── organizer (string) - организатор
├── startDate (timestamp) - дата начала
├── registrationDeadline (timestamp) - дедлайн регистрации
├── endDate (timestamp) - дата окончания
├── createdAt (timestamp) - дата создания записи
├── createdBy (string) - ID администратора, создавшего турнир
└── status (string) - статус (upcoming, ongoing, completed, cancelled)
```

**Пример документа:**
```json
{
  "name": "Winter Showdown 2026",
  "game": "CS2",
  "description": "Эпический полнофункциональный турнир по CS2",
  "prizePool": 25000,
  "maxTeams": 16,
  "registeredTeams": 8,
  "format": "BO3",
  "level": "Любительский",
  "region": "Online",
  "organizer": "CYBERTOUR",
  "startDate": "2026-02-28T18:00:00Z",
  "registrationDeadline": "2026-02-25T23:59:59Z",
  "endDate": "2026-02-28T23:00:00Z",
  "createdAt": "2026-02-10T10:00:00Z",
  "createdBy": "admin123",
  "status": "upcoming"
}
```

---

### 1.3 Коллекция: `registrations`
История и статус регистраций пользователей на турниры (Действия).

**Документ структура:**
```
registrations/{registrationId}
├── tournamentId (string) - ID турнира
├── tournamentName (string) - название турнира
├── game (string) - игра
├── userId (string) - ID пользователя
├── userName (string) - имя пользователя
├── status (string) - статус (pending, approved, rejected, cancelled)
├── createdAt (timestamp) - дата регистрации
├── approvedAt (timestamp, optional) - дата одобрения
├── notes (string, optional) - комментарии администратора
└── teamMembers (array, optional) - участники команды
```

**Пример документа:**
```json
{
  "tournamentId": "tournament123",
  "tournamentName": "Winter Showdown 2026",
  "game": "CS2",
  "userId": "user123abc",
  "userName": "ProGamer",
  "status": "approved",
  "createdAt": "2026-02-24T15:45:00Z",
  "approvedAt": "2026-02-24T16:30:00Z",
  "notes": "Команда одобрена",
  "teamMembers": ["player1", "player2", "player3", "player4", "player5"]
}
```

---

### 1.4 Коллекция: `reviews` (опционально)
Отзывы и комментарии пользователей о турнирах.

**Документ структура:**
```
reviews/{reviewId}
├── tournamentId (string) - ID турнира
├── userId (string) - ID автора отзыва
├── userName (string) - имя автора
├── rating (number 1-5) - оценка
├── title (string) - заголовок отзыва
├── content (string) - текст отзыва
├── createdAt (timestamp) - дата создания
└── helpful (number) - кол-во "полезно"
```

---

## 2. Firebase Security Rules

### 2.1 Правила доступа (Firestore Rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read, write: if (request.auth != null && request.auth.uid == userId) || isAdmin();
    }

    match /tournaments/{tournamentId} {
      allow read: if true;
      allow update: if request.auth != null; 
      allow create, delete: if isAdmin();
    }

    match /registrations/{regId} {
      allow read: if (request.auth != null && resource.data.userId == request.auth.uid) || isAdmin();
      allow create: if request.auth != null;
      allow update, delete: if isAdmin();
    }
  }
}
```

### 2.2 Правила доступа (Storage Rules) - ДОБАВЛЕНО ДЛЯ АВАТАРОВ

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    function isAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    function isValidImage() {
      return request.resource.contentType.matches('image/.*')
             && request.resource.size < 5 * 1024 * 1024; // 5MB max
    }

    // Аватары пользователей - пользователи могут загружать свои аватары
    match /avatars/{userId}/{allPaths=**} {
      allow write: if isOwner(userId) && isValidImage();
      allow read: if true; // Все могут видеть аватары
    }

    // Изображения турниров - только админ может загружать
    match /tournaments/{tournamentId}/{allPaths=**} {
      allow write: if isAdmin() && isValidImage();
      allow read: if true;
    }

    // Запрет по умолчанию для всех остальных файлов
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```
```
Коллекция: tournaments
Поле 1: createdAt (по убыванию)
Поле 2: game (возрастание)
```

**Индекс 2: registrations - для поиска по пользователю**
```
Коллекция: registrations
Поле 1: userId (возрастание)
Поле 2: createdAt (по убыванию)
```

**Индекс 3: registrations - фильтр по статусу**
```
Коллекция: registrations
Поле 1: tournamentId (возрастание)
Поле 2: status (возрастание)
```

**Индекс 4: reviews - для турнира**
```
Коллекция: reviews
Поле 1: tournamentId (возрастание)
Поле 2: createdAt (по убыванию)
```

---

## 4. Оптимизированные запросы

### 4.1 Примеры оптимизированных запросов (Code)

**Загрузить турниры с пагинацией (используется в коде):**
```javascript
// ✅ ХОРОШО: используется limit и select
import { collection, query, orderBy, limit, select } from 'firebase/firestore';

const q = query(
  collection(db, 'tournaments'),
  orderBy('createdAt', 'desc'),
  limit(15),
  select([
    'name', 'game', 'prizePool', 'registeredTeams', 'maxTeams', 'startDate'
  ]) // Грузим только нужные поля
);
```

**Получить регистрации пользователя:**
```javascript
// ✅ ХОРОШО: индекс есть, используется limit
const q = query(
  collection(db, 'registrations'),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(20)
);
```

**Реальное время слушатель (onSnapshot):**
```javascript
// ✅ ХОРОШО: используется для обновления в реальном времени
const unsubscribe = onSnapshot(
  query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')),
  (snapshot) => {
    tournaments.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
);

// Очистка при размонтировании
onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
```

---

## 5. Рекомендации по использованию

### 5.1 Best Practices

✅ **Делай:**
- Используй `select()` чтобы загружать только нужные поля
- Используй `limit()` для пагинации
- Используй `onSnapshot()` для реального времени данных
- Индексируй часто используемые комбинации полей
- Кешируй данные на клиенте когда возможно

❌ **Не делай:**
- Не загружай всю коллекцию за раз
- Не слушай большие коллекции без фильтра
- Не создавай индексы для редко используемых запросов
- Не обновляй счетчики incrementом каждый раз (используй Cloud Functions)

### 5.2 Firebase Quotas (бесплатный план)

- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- Max 1MB на документ

---

## 5. Firebase Storage Rules (для аватаров и изображений турниров)

### 5.1 Правила доступа (Storage Rules)

Создайте файл `storage.rules` в корне проекта Firebase или настройте через Firebase Console > Storage > Rules:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // ===== ФУНКЦИИ =====
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isValidImage() {
      return request.resource.contentType.matches('image/.*') 
             && request.resource.size < 5 * 1024 * 1024; // 5MB max
    }

    // ===== АВАТАРЫ ПОЛЬЗОВАТЕЛЕЙ =====
    match /avatars/{userId}/{allPaths=**} {
      // Пользователь может загружать/обновлять свой аватар
      allow write: if isOwner(userId) && isValidImage();
      
      // Все могут читать аватары (для отображения в интерфейсе)  
      allow read: if true;
    }

    // ===== ИЗОБРАЖЕНИЯ ТУРНИРОВ ===== (опционально, для будущих фич)
    match /tournaments/{tournamentId}/{allPaths=**} {
      // Только админ может загружать изображения турниров
      allow write: if isAdmin() && isValidImage();
      
      // Все могут читать изображения турниров
      allow read: if true;
    }

    // ===== ДРУГИЕ ФАЙЛЫ ===== (запрещено по умолчанию) 
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 5.2 Как применить Storage Rules

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект `labb-wwork`
3. Перейдите в **Storage**
4. Откройте вкладку **Rules**
5. Замените содержимое на текст из раздела 5.1
6. Нажмите **Publish**

---

## 6. Тестирование Security Rules

Используй Firebase Emulator Suite для локального тестирования:

```bash
# Установить Firebase CLI
npm install -g firebase-tools

# Инициализировать эмулятор
firebase init emulator

# Запустить эмулятор
firebase emulators:start
```

---

## Конец документации

**Последнее обновление:** 5 марта 2026 г.  
**Версия:** 1.0
