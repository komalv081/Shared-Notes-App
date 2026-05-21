# Shared Notes App Backend

A Node.js + Express + MongoDB backend for a shared notes/checklist mobile app.

It supports:
- user registration and login with JWT
- creating folders (single or multiple in one request)
- adding checklist items (single or multiple in one request)
- fetching folders and folder items
- generating a share link for folders

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)

## Project Structure

```txt
src/
  app.js
  controllers/
    authController.js
    folderController.js
  middlewares/
    authMiddleware.js
  models/
    User.js
    folder.js
    checklistItem.js
  routes/
    authRoutes.js
    userRoutes.js
    folderRoutes.js
```

## Environment Variables

Create a `.env` file in project root:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
APP_BASE_URL=http://localhost:5000
```

`APP_BASE_URL` is optional and used when generating share links.

`DNS_SERVERS` is optional (default: `8.8.8.8,1.1.1.1`). Used when connecting with `mongodb+srv://` if your local DNS refuses SRV lookups (`querySrv ECONNREFUSED`).

Use either `MONGO_URI` or `MONGODB_URI` in `.env` (both are supported).

## Installation

```bash
npm install
```

## Run Server

```bash
npm start
```

Server starts only after successful MongoDB connection.

## Web UI

A built-in web console is served at [http://localhost:5000](http://localhost:5000) when the server is running.

Features:
- Dashboard with links to all API sections
- Authentication (register / login with token storage)
- Profile, Folders, and Checklist Items pages
- Buttons wired to every documented API endpoint
- Light and dark theme (persisted in browser)
- JSON response panel for each section

Static files live in `public/`.

## Authentication

Protected routes require:

```http
Authorization: Bearer <token>
```

## API Endpoints

Base URL: `https://shared-notes-app-jhy1.onrender.com/`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### User

- `GET /api/user/profile` (protected)

### Folders

- `GET /api/folders` (protected)  
  Fetch folders where user is owner/member.

- `POST /api/folders` (protected)  
  Create one or multiple folders.

  Single input:
  ```json
  { "title": "Shopping List" }
  ```

  Multiple input:
  ```json
  { "titles": ["Shopping List", "Office Tasks"] }
  ```

- `GET /api/folders/:folderId/share-link` (protected)  
  Generate share link for a folder.

### Checklist Items

- `GET /api/folders/:folderId/items` (protected)  
  Fetch checklist items in a folder.

- `POST /api/folders/:folderId/items` (protected)  
  Create one or multiple items in a folder.

  Single input:
  ```json
  { "text": "Buy milk" }
  ```

  Multiple input:
  ```json
  { "items": ["Buy milk", "Buy eggs", "Buy bread"] }
  ```

## Notes

- If database is unavailable, API returns:
  - `503 Database unavailable. Please try again in a moment.`
- `.env` and `node_modules` are excluded via `.gitignore`.

## Next Suggested API

- `POST /api/folders/join/:shareCode` (protected)  
  Allow invited users to join a shared folder.
