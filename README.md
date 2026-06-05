# 🚗 CarStore REST API

A production-ready Node.js REST API for the CarStore Flutter app — supporting Email/Google/Facebook auth, car listings with advanced filtering, Cloudinary-hosted 3D models, and image uploads.

---

## 📁 Project Structure

```
carstore-api/
├── src/
│   ├── app.js                      # Entry point
│   ├── config/
│   │   ├── database.js             # PostgreSQL + Sequelize
│   │   ├── cloudinary.js           # Cloudinary (images + 3D models)
│   │   └── passport.js             # JWT + Google + Facebook strategies
│   ├── models/
│   │   ├── index.js                # Associations
│   │   ├── user.model.js           # Users table
│   │   ├── car.model.js            # Cars table
│   │   └── carImage.model.js       # Car images + 3D models tables
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── car.controller.js
│   │   ├── model.controller.js     # 3D model management
│   │   └── user.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── car.routes.js
│   │   ├── model.routes.js
│   │   └── user.routes.js
│   └── middleware/
│       ├── auth.middleware.js
│       └── validate.middleware.js
├── .env.example
└── package.json
```

---

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Setup PostgreSQL
```bash
# Create database
psql -U postgres -c "CREATE DATABASE carstore_db;"
```

### 4. Run Server
```bash
npm run dev        # Development (nodemon)
npm start          # Production
```

---

## 🔐 Authentication

### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Ahmed",
  "lastName": "Mohamed"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "firstName": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "password123" }
```

### Google OAuth (Flutter)
```
1. Open WebView to: GET /api/auth/google
2. After login, Google redirects to your callback URL
3. Server redirects to Flutter deep link:
   carstore://auth/callback?accessToken=eyJ...&refreshToken=eyJ...&userId=...
4. Flutter catches the deep link and extracts the tokens
```

### Facebook OAuth (Flutter)
```
Same flow as Google, starting from: GET /api/auth/facebook
```

### Refresh Token
```
POST /api/auth/refresh
{ "refreshToken": "eyJ..." }
```

### Logout
```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

---

## 🚗 Cars API

### List Cars (with filters)
```
GET /api/cars

Query Parameters (all optional):
  search          Full text search (brand/model/description)
  brand           e.g. "Toyota"
  model           e.g. "Camry"
  condition       new | used | certified_pre_owned
  modelType       sedan | suv | truck       ← maps to your 3D model
  city            e.g. "Cairo"
  fuelType        gasoline | diesel | electric | hybrid | plug_in_hybrid
  transmission    automatic | manual | cvt
  driveType       fwd | rwd | awd | 4wd
  color           e.g. "Red"
  minPrice        e.g. 5000
  maxPrice        e.g. 50000
  minYear         e.g. 2018
  maxYear         e.g. 2023
  minMileage      e.g. 0
  maxMileage      e.g. 100000
  minRating       e.g. 4.0
  isFeatured      true | false
  sortBy          price | year | mileage | rating | createdAt | viewCount
  sortOrder       asc | desc
  page            default: 1
  limit           default: 10, max: 50

Examples:
  GET /api/cars?brand=Tesla&condition=used&minPrice=20000&maxPrice=60000
  GET /api/cars?modelType=suv&city=Cairo&sortBy=price&sortOrder=asc
  GET /api/cars?search=tesla&minYear=2020&fuelType=electric
```

### Get Single Car
```
GET /api/cars/:id

Response includes: car details + images[] + seller info + model3dUrl
```

### Get Filter Options (for filter screen dropdowns)
```
GET /api/cars/filter-options

Response:
{
  "brands": ["Toyota", "Tesla", "BMW", ...],
  "cities": ["Cairo", "Alexandria", ...],
  "conditions": ["new", "used", "certified_pre_owned"],
  "modelTypes": ["sedan", "suv", "truck"],
  "fuelTypes": [...],
  "priceRange": { "min": 1000, "max": 500000 },
  "yearRange": { "min": 2005, "max": 2024 }
}
```

### Get Featured Cars
```
GET /api/cars/featured
```

### Create Car Listing (Sell a car)
```
POST /api/cars
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
  brand*          string
  model*          string
  year*           number
  price*          number
  modelType*      sedan | suv | truck   ← links to your Cloudinary 3D model
  condition       new | used | certified_pre_owned
  mileage         number (km)
  fuelType        string
  transmission    string
  color           string
  features        JSON string: '["Bluetooth","Cruise Control"]'
  city            string
  description     string
  images          File[] (up to 10 images, max 10MB each)
```

### Update Car
```
PATCH /api/cars/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
(same fields as create, all optional)
```

### Delete Car
```
DELETE /api/cars/:id
Authorization: Bearer <token>
```

---

## 🎮 3D Models API

These are your 3 pre-uploaded models. Cars reference them by `modelType`.

### Get All Models
```
GET /api/models

Response:
{
  "models": [
    {
      "modelType": "sedan",
      "url": "https://res.cloudinary.com/.../model_sedan.glb",
      "thumbnailUrl": "https://...",
      "displayName": "Compact Sedan"
    },
    ...
  ]
}
```

### Get Model by Type
```
GET /api/models/sedan     ← or /suv or /truck
```

### Upload / Replace 3D Model (Admin only)
```
POST /api/models/upload
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

  modelType*    sedan | suv | truck
  model*        File (.glb or .gltf, max 100MB)
  displayName   string (optional)

Note: If a model of this type exists, it's replaced automatically.
      All cars using this modelType get the new URL.
```

### Update Thumbnail (Admin only)
```
PATCH /api/models/:modelType/thumbnail
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
  avatar        image file
```

### Delete Model (Admin only)
```
DELETE /api/models/:modelType
Authorization: Bearer <admin_token>
```

---

## 👤 User API

All routes require `Authorization: Bearer <token>`

### Get Profile
```
GET /api/users/profile
```

### Update Profile
```
PATCH /api/users/profile
Content-Type: multipart/form-data
  firstName, lastName, phone, avatar (image file)
```

### Change Password
```
PATCH /api/users/change-password
{ "currentPassword": "old", "newPassword": "new123" }
```

### My Listings
```
GET /api/users/my-listings?status=available&page=1&limit=10
```

### Delete Account
```
DELETE /api/users/account
```

---

## 🛠️ Flutter Integration Guide

### 1. Add Dependencies (pubspec.yaml)
```yaml
dependencies:
  dio: ^5.3.3                    # HTTP client
  flutter_secure_storage: ^9.0.0  # Store JWT tokens
  google_sign_in: ^6.1.6         # Google OAuth
  flutter_facebook_auth: ^6.0.4  # Facebook OAuth
  uni_links: ^0.5.1              # Deep link for OAuth callback
  model_viewer_plus: ^1.7.0      # Display .glb 3D models
```

### 2. Register Deep Link (for OAuth)
**Android** (AndroidManifest.xml):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="carstore" android:host="auth"/>
</intent-filter>
```

**iOS** (Info.plist):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>carstore</string></array>
  </dict>
</array>
```

### 3. Display 3D Models in Flutter
```dart
// Fetch the model URL from /api/models/sedan (or suv/truck)
// Then display with ModelViewer:

ModelViewer(
  src: car.model3dUrl,      // e.g. "https://res.cloudinary.com/.../model_sedan.glb"
  alt: car.brand,
  autoRotate: true,
  cameraControls: true,
  backgroundColor: const Color.fromARGB(0xFF, 0xEE, 0xEE, 0xEE),
)
```

### 4. Filter Cars Example
```dart
Future<List<Car>> fetchCars({
  String? brand,
  String? condition,
  String? modelType,
  double? minPrice,
  double? maxPrice,
  int page = 1,
}) async {
  final response = await dio.get('/api/cars', queryParameters: {
    if (brand != null) 'brand': brand,
    if (condition != null) 'condition': condition,
    if (modelType != null) 'modelType': modelType,
    if (minPrice != null) 'minPrice': minPrice,
    if (maxPrice != null) 'maxPrice': maxPrice,
    'page': page,
    'limit': 10,
    'sortBy': 'price',
    'sortOrder': 'asc',
  });
  // ...
}
```

---

## 🗄️ Database Schema (Auto-created by Sequelize)

```
users           id, email, password, firstName, lastName, phone, avatar,
                googleId, facebookId, authProvider, role, isActive, refreshToken

cars            id, brand, model, year, trim, price, condition, mileage,
                modelType, model3dUrl, fuelType, transmission, driveType,
                color, features (JSONB), city, rating, status, sellerId (FK)

car_images      id, carId (FK), url, publicId, isPrimary, order

car_models_3d   id, modelType (unique), url, publicId, thumbnailUrl, displayName
```

---

## 🔒 Security Features

- JWT Access Tokens (7d) + Refresh Tokens (30d)
- bcrypt password hashing (12 rounds)
- Rate limiting on all routes (100/15min), stricter on auth (10/15min)
- Helmet.js security headers
- CORS configuration
- Input validation with express-validator
- Admin role protection for 3D model management

---

## ☁️ Cloudinary Folders

```
carstore/
├── 3d-models/     → Your 3 .glb files (sedan, suv, truck)
├── car-images/    → User-uploaded car photos
└── avatars/       → User profile pictures
```
