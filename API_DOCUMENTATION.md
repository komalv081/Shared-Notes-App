# API Documentation

Base URL: http://localhost:5000/api

All requests should include Content-Type: application/json in headers.

## Authentication

### Register User
- **Method**: POST
- **Endpoint**: /auth/register
- **Body**:
  `json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  `
- **Response (Success)**:
  `json
  {
    "message": "User registered Successfully",
    "user": {
      "_id": "string",
      "name": "string",
      "email": "string",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  `
- **Response (Error)**: 400 if user exists, 500 for server error

### Login User
- **Method**: POST
- **Endpoint**: /auth/login
- **Body**:
  `json
  {
    "email": "string",
    "password": "string"
  }
  `
- **Response (Success)**:
  `json
  {
    "message": "Login successful",
    "token": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
  `
- **Response (Error)**: 400 for invalid credentials, 500 for server error

## User Profile

### Get User Profile
- **Method**: GET
- **Endpoint**: /user/profile
- **Headers**:
  `
  Authorization: Bearer <token>
  `
- **Response (Success)**:
  `json
  {
    "message": "Protected route accessed ✅",
    "user": {
      "userId": "string",
      "iat": number,
      "exp": number
    }
  }
  `
- **Response (Error)**: 401 for invalid/no token

## Folders

All folder endpoints require authentication header: Authorization: Bearer <token>

### Get All Folders
- **Method**: GET
- **Endpoint**: /folders
- **Headers**:
  `
  Authorization: Bearer <token>
  `
- **Response (Success)**:
  `json
  {
    "message": "Folders fetched",
    "folders": [
      {
        "_id": "string",
        "title": "string",
        "owner": {
          "_id": "string",
          "name": "string",
          "email": "string"
        },
        "members": ["string"],
        "shareCode": "string",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  `

### Create Folder
- **Method**: POST
- **Endpoint**: /folders
- **Headers**:
  `
  Authorization: Bearer <token>
  Content-Type: application/json
  `
- **Body** (Option 1 - Single folder):
  `json
  {
    "title": "string"
  }
  `
- **Body** (Option 2 - Multiple folders):
  `json
  {
    "titles": ["string", "string"]
  }
  `
- **Response (Success)**:
  `json
  {
    "message": "X folder(s) created",
    "count": number,
    "folders": [
      {
        "_id": "string",
        "title": "string",
        "owner": "string",
        "members": ["string"],
        "shareCode": "string",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  `
- **Response (Error)**: 400 for invalid input

### Update Folder
- **Method**: PATCH
- **Endpoint**: /folders/{folderId}
- **Headers**:
  `
  Authorization: Bearer <token>
  Content-Type: application/json
  `
- **Body**:
  `json
  {
    "title": "string"
  }
  `
- **Response (Success)**:
  `json
  {
    "message": "Folder updated",
    "folder": {
      "_id": "string",
      "title": "string",
      "owner": "string",
      "members": ["string"],
      "shareCode": "string",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  `
- **Response (Error)**: 400 for invalid folderId/title, 403 for no access, 500 for server error

### Delete Folder
- **Method**: DELETE
- **Endpoint**: /folders/{folderId}
- **Headers**:
  `
  Authorization: Bearer <token>
  `
- **Response (Success)**:
  `json
  {
    "message": "Folder and its items deleted"
  }
  `
- **Response (Error)**: 400 for invalid folderId, 403 for no access, 500 for server error

### Get Share Link
- **Method**: GET
- **Endpoint**: /folders/{folderId}/share-link
- **Headers**:
  `
  Authorization: Bearer <token>
  `
- **Response (Success)**:
  `json
  {
    "message": "Share link generated",
    "folderId": "string",
    "shareCode": "string",
    "shareLink": "string"
  }
  `

## Folder Items

### Get Folder Items
- **Method**: GET
- **Endpoint**: /folders/{folderId}/items
- **Headers**:
  `
  Authorization: Bearer <token>
  `
- **Response (Success)**:
  `json
  {
    "message": "Folder items fetched",
    "folder": {
      "_id": "string",
      "title": "string",
      "shareCode": "string"
    },
    "items": [
      {
        "_id": "string",
        "folderId": "string",
        "text": "string",
        "isCompleted": boolean,
        "createdBy": {
          "_id": "string",
          "name": "string",
          "email": "string"
        },
        "lastModifiedBy": {
          "_id": "string",
          "name": "string",
          "email": "string"
        },
        "lastAction": "string",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  `

### Create List Item
- **Method**: POST
- **Endpoint**: /folders/{folderId}/items
- **Headers**:
  `
  Authorization: Bearer <token>
  Content-Type: application/json
  `
- **Body** (Option 1 - Single item):
  `json
  {
    "text": "string"
  }
  `
- **Body** (Option 2 - Multiple items):
  `json
  {
    "items": ["string", "string"]
  }
  `
- **Response (Success)**:
  `json
  {
    "message": "X list item(s) created",
    "count": number,
    "items": [
      {
        "_id": "string",
        "folderId": "string",
        "text": "string",
        "isCompleted": false,
        "createdBy": "string",
        "lastModifiedBy": "string",
        "lastAction": "created",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  `
- **Response (Error)**: 400 for invalid folderId/input, 403 for no access

### Update List Item
- **Method**: PATCH
- **Endpoint**: /folders/items/{itemId}
- **Headers**:
  `
  Authorization: Bearer <token>
  Content-Type: application/json
  `
- **Body** (Update text):
  `json
  {
    "text": "string"
  }
  `
- **Body** (Update completion):
  `json
  {
    "isCompleted": boolean
  }
  `
- **Body** (Update both):
  `json
  {
    "text": "string",
    "isCompleted": boolean
  }
  `
- **Response (Success)**:
  `json
  {
    "message": "Item updated",
    "item": {
      "_id": "string",
      "folderId": "string",
      "text": "string",
      "isCompleted": boolean,
      "createdBy": "string",
      "lastModifiedBy": "string",
      "lastAction": "string",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  `
- **Response (Error)**: 400 for invalid itemId/input, 403 for no access, 404 for item not found

### Delete List Item
- **Method**: DELETE
- **Endpoint**: /folders/items/{itemId}
- **Headers**:
  `
  Authorization: Bearer <token>
  `
- **Response (Success)**:
  `json
  {
    "message": "Item deleted"
  }
  `
- **Response (Error)**: 400 for invalid itemId, 403 for no access, 404 for item not found