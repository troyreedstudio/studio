# Pineapple (Pink Pineapple) — Technical Documentation

This document describes the architecture and major components of the **Pineapple** Flutter application (appears branded as **Pink Pineapple** via API domains and assets).

If anything below is unclear from the code, the documentation makes reasonable assumptions and calls them out explicitly.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [State Management](#3-state-management)
4. [Folder Structure](#4-folder-structure)
5. [Tech Stack](#5-tech-stack)
6. [Key Modules / Components](#6-key-modules--components)
7. [API & Data Handling](#7-api--data-handling)
8. [Setup & Running Instructions](#8-setup--running-instructions)
9. [Scalability & Improvements](#9-scalability--improvements)
10. [Summary for Client](#10-summary-for-client)

---

# 1. Project Overview

## What the application does
Pineapple is a Flutter mobile application that connects users to **events and community content**. Based on the modules and endpoints, it supports:

- Event discovery (including “tonight” events)
- Event details and ticket/booking flows
- A social/newsfeed style post system (posts, likes, comments, favorites/saves, hide/unhide)
- User profiles and social graph (following/followers, blocked users)
- In-app chat using WebSockets

## Key features and purpose
- **Guest (Free User) browsing:** non-logged-in users can browse public events and public posts.
- **Authentication:** login/register/forgot password + OTP verification/reset password flows.
- **Personalized experience for logged-in users:** bookings, profile, messages, favorites/saved content.
- **Real-time messaging:** WebSocket-backed chat and conversation list.

## Target users (inferred)
- End users interested in finding events, booking tickets, and interacting with a community feed.
- Users who want to message other users in real time.

Assumption: This is a consumer-facing app (not an internal enterprise tool), inferred from UI modules and public browsing mode.

---

# 2. Architecture

## High-level architecture
The app uses a **feature-first Flutter architecture** with a shared **core layer**, plus **GetX** for:

- State management (reactive variables)
- Dependency injection/service location
- Navigation

It is not a strict “Clean Architecture” setup (e.g., no explicit domain/data layers), but it does follow a practical separation:

- **Core layer:** shared services/utilities (networking, storage, UI widgets, constants)
- **Feature modules:** UI + controllers + feature models/widgets

## How parts interact
Typical interaction flow:

1. **UI (Widget)** triggers a **Controller** action (e.g., login button calls `LoginController.login`).
2. Controller calls **Network layer** (`NetworkConfigV1.ApiRequestHandler`) and/or **Local storage** (`LocalService`).
3. Controller updates **GetX reactive state** (`.obs`, `RxBool`, `RxList`), which triggers UI updates via `Obx`.
4. Navigation is performed via `Get.to(...)` / `Get.off(...)`.

## Important design patterns used
- **Controller pattern (GetX):** UI logic lives in controllers extending `GetxController`.
- **Service pattern:** long-lived app services (e.g., `WebSocketService`) extend `GetxService` and are registered globally.
- **Singleton/service locator (Get.put / Get.find):** dependencies are accessed via GetX’s DI container.
- **Configuration wrapper:** `NetworkConfigV1` centralizes HTTP calls and headers.

---

# 3. State Management

## How state is handled
State is handled using **GetX reactive variables**:

- `RxBool`, `RxList<T>`, `Rxn<T>` and `.obs`
- UI uses `Obx(() => ...)` to rebuild when reactive values change

Examples (from inspected code):

- Login UI observes `LoginController.isLoading` and `LoginController.obscureText`
- Bottom navigation observes `HomeNavController.currentIndex`
- User data is stored in `UserInfoController.userInfo` as `Rxn<UserInfoModel>`

## Data flow (simple explanation)
- **User action → Controller method → API/Storage → Reactive state update → UI refresh**

Additionally:
- A **persistent token** is stored using `SharedPreferences` via `LocalService`.
- App startup checks that token to decide whether to open the logged-in home or the free-user home.

---

# 4. Folder Structure

## High-level tree

```text
pineapple/
├── android/               # Android native wrapper + build config
├── ios/                   # iOS native wrapper + pods
├── web/                   # Web wrapper (Flutter web)
├── macos/ linux/ windows/ # Desktop platform wrappers
├── assets/                # Images, icons, animations, JSON policy docs
├── lib/
│   ├── main.dart           # App entry point
│   ├── core/               # Shared services, networking, storage, widgets
│   └── feature/            # App features (auth, events, home, chat, etc.)
├── test/                  # Flutter tests (currently basic widget test)
├── pubspec.yaml           # Dependencies + assets
└── README.md              # This documentation
```

## Purpose of major folders/files

- [lib/main.dart](lib/main.dart) — Application entry point. Registers the WebSocket service, initializes UI configuration (EasyLoading, ScreenUtil) and starts the splash screen.
- [lib/core](lib/core) — Shared app-wide layer:
  - `network_caller/` — HTTP client wrapper and API endpoints.
  - `local/` — `SharedPreferences` wrapper for token/user data persistence.
  - `services/` — app services such as the WebSocket client.
  - `global_widgets/` — reusable UI widgets such as snackbars and loaders.
  - `binding/` — GetX bindings for dependency registration (currently minimal).
- [lib/feature](lib/feature) — Feature modules grouped by functionality:
  - `auth/` — splash, login, signup, password reset.
  - `free_user/` — guest browsing experience.
  - `home/`, `explore/`, `bookings/`, `profile_tab/` — main authenticated areas.
  - `chat_tab/` — messaging UI, controllers, models.
  - `event_details*/` — event pages, tables/options, checkout/tickets.
  - `newsfeed/` and related folders — posts, favorites/saved/hidden flows.
  - `report/`, `blocked_user/`, `follwing_followers/` — safety/social features.

Note: Feature folders include a mix of `ui/`, `controller/`, `model/`, `widgets/` (exact structure varies by feature).

---

# 5. Tech Stack

## Core technologies
- **Language:** Dart (SDK constraint: `^3.9.0`)
- **Framework:** Flutter

## Key libraries (from pubspec)
- **GetX:** `get` — state management, navigation, dependency injection
- **Networking:** `http`, `internet_connection_checker`
- **Persistence:** `shared_preferences`
- **Real-time:** `web_socket_channel`
- **UI helpers:** `flutter_screenutil`, `flutter_easyloading`, `google_nav_bar`, `lottie`, `cached_network_image`, `flutter_svg`, `google_fonts`
- **Utilities:** `logger`, `intl`, `permission_handler`, `image_picker`, `file_picker`
- **Upgrade prompts:** `upgrader`

---

# 6. Key Modules / Components

This section highlights the main modules and important classes.

## App startup & navigation
- [lib/main.dart](lib/main.dart)
  - Configures EasyLoading
  - Registers [lib/core/services/websocket_service.dart](lib/core/services/websocket_service.dart) as a permanent service via `Get.put(..., permanent: true)`
  - Starts GetX app (`GetMaterialApp`) with [lib/feature/auth/ui/0.splash_ui.dart](lib/feature/auth/ui/0.splash_ui.dart)

- [Splash screen controller](lib/feature/auth/controller/0.splash_screen_controller.dart)
  - Reads token from `SharedPreferences` via `LocalService`
  - Routes to authenticated home ([lib/feature/home_bottom_nav/ui/home_bottom_nav.dart](lib/feature/home_bottom_nav/ui/home_bottom_nav.dart)) if token exists
  - Otherwise routes to free browsing home ([lib/feature/free_user/ui/free_user_home_page.dart](lib/feature/free_user/ui/free_user_home_page.dart))

## Authentication
- [Login UI](lib/feature/auth/ui/1.login_ui.dart)
  - Collects email/password and calls `LoginController.login(...)`
  - Uses `Obx` to react to loading state and password visibility

- [Login controller](lib/feature/auth/controller/1.login_controller.dart)
  - Validates inputs (required fields, min password length)
  - Calls `POST /auth/login` via `NetworkConfigV1.ApiRequestHandler`
  - Persists `token` and tries to persist `userId` from several possible response shapes
  - Initializes WebSocket after login and navigates to the main home
  - Includes a `getProfile()` method that fetches profile info and stores basic fields locally

Login flow (simplified):

```text
Login button
	→ LoginController.login(email, password)
		→ POST /auth/login
		→ save token/userId locally
		→ connect WebSocket (authenticate + messageList)
		→ navigate to HomeBottomNav
```

## User info
- [User info controller](lib/core/const/user_info/user_info_controller.dart)
  - Calls `GET /auth/profile` (authenticated)
  - Parses response into `UserInfoModel`
  - Saves userId for chat usage

## Home & tabs
- [Home bottom navigation](lib/feature/home_bottom_nav/ui/home_bottom_nav.dart)
  - Uses an `IndexedStack` for tab switching
  - Uses `HomeNavController.currentIndex` as reactive state

## Free user (guest) mode
- [Free user home](lib/feature/free_user/ui/free_user_home_page.dart)
  - Shows a browse-only experience for posts/events
  - Most interactive actions prompt the user to login

Reference implementation notes are also available in [FREE_USER_IMPLEMENTATION_GUIDE.md](FREE_USER_IMPLEMENTATION_GUIDE.md).

## Networking
- [API endpoints](lib/core/network_caller/endpoints.dart)
  - `Urls.baseUrl`: `https://api.pinkpineapple.app/api/v1`
  - Contains endpoint constants for auth, events, bookings, posts, follow, block, etc.

- [Network client wrapper](lib/core/network_caller/network_config.dart)
  - `NetworkConfigV1.ApiRequestHandler(...)` supports GET/POST/PATCH/PUT/DELETE and multipart uploads
  - When `is_auth: true`, it loads the token from `SharedPreferences` and sets `Authorization` header

## Real-time chat (WebSocket)
- [WebSocket service](lib/core/services/websocket_service.dart)
  - Maintains a persistent socket connection
  - Provides a broadcast stream of JSON events (`events`)
  - Supports reconnect with exponential backoff
  - Sends app-specific events like `authenticate`, `messageList`, `fetchChats`, `message`

---

# 7. API & Data Handling

## How data is fetched
- **REST API** via `http` in [lib/core/network_caller/network_config.dart](lib/core/network_caller/network_config.dart)
- `InternetConnectionChecker` is used to detect connectivity and show a toast when offline

## API structure (inferred)
Base URL is defined as:

- `https://api.pinkpineapple.app/api/v1`

Endpoints are grouped in [lib/core/network_caller/endpoints.dart](lib/core/network_caller/endpoints.dart) (auth, users, events, bookings, posts, comments, follow, block).

Assumption: The backend accepts the raw token string in the `Authorization` header (the app currently sets `Authorization: <token>` rather than `Bearer <token>`).

## How data is stored
- **Token and lightweight user metadata** are stored in `SharedPreferences` using [lib/core/local/local_data.dart](lib/core/local/local_data.dart) `LocalService`.
- `PreferenceKey` includes `token`, `userId`, `name`, `email`, `imagePath`, etc.

## Real-time data
- Chat uses WebSockets at `wss://api.pinkpineapple.app` (see `Urls.wsUrl`), using event-based JSON messages.

---

# 8. Setup & Running Instructions

## Requirements
- Flutter SDK installed (compatible with Dart `^3.9.0`)
- Xcode (for iOS builds on macOS)
- Android Studio + Android SDK (for Android builds)

## Install dependencies

```bash
flutter pub get
```

## Run the app

```bash
flutter run
```

## iOS (if you hit CocoaPods issues)

```bash
cd ios
pod install
cd ..
flutter run
```

## Build artifacts (optional)

```bash
flutter build apk
flutter build ios
```

## Configuration notes
- API and WebSocket base URLs are currently hard-coded in [lib/core/network_caller/endpoints.dart](lib/core/network_caller/endpoints.dart).
- If you need different environments (dev/staging/prod), see the improvement suggestions below.

---

# 9. Scalability & Improvements

Optional but valuable improvements (based on the current code patterns):

1. **Environment configuration**
   - Move base URLs to flavors or a config layer (dev/stage/prod) rather than hard-coded constants.

2. **Typed API layer**
   - Introduce typed request/response models and a repository layer to reduce dynamic map parsing (e.g., login userId extraction).

3. **Consistent auth header**
   - Confirm backend requirements and standardize on `Authorization: Bearer <token>` if applicable.

4. **Centralized error handling**
   - The network layer currently shows snackbars/toasts in the HTTP wrapper. Consider returning structured errors and letting UI decide how to present them.

5. **Secure token storage**
   - For production security, consider storing auth tokens in `flutter_secure_storage` instead of `SharedPreferences`.

6. **Routing structure**
   - Consider defining named routes with `GetPage` and optional middleware for auth guarding.f

7. **Observability**
   - Standardize logging (levels, redaction of tokens, crash reporting) to support production debugging.

---

# 10. Summary for Client

Pineapple is a mobile app where users can browse events and community posts, book events, manage a profile, and chat with other users. People who are not logged in can still explore public content, and when they decide to sign up, the app unlocks full interaction—saving favorites, making bookings, and real-time messaging.

