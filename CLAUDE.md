# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meeting room booking system (会议室预约系统). The current stack is a migration from Flask + vanilla JS to **Vue 3 + Spring Boot**.

## Development Commands

### Backend (Spring Boot)
```bash
cd backend-spring
mvn spring-boot:run          # Start dev server on port 5000
mvn test                     # Run tests
```

### Frontend (Vue 3 + Vite)
```bash
cd frontend-vue
npm run dev                  # Start Vite dev server
npm run dev:host             # Dev server exposed on LAN
npm run build                # Type-check + production build
npm run preview              # Preview production build
```

### Old backend (Flask, for reference)
```bash
cd backend
python app.py                # Flask dev server on port 5000
python backend/scripts/test_api.py  # API integration tests
```

## Architecture

### Entry Points

The frontend has **two HTML entry points** that boot the same Vue app:
- `frontend-vue/index.html` — sets `window.__MEETING_ADMIN_APP__ = false`, loads `entry-user.ts`
- `frontend-vue/admin.html` — sets `window.__MEETING_ADMIN_APP__ = true`, loads `entry-admin.ts`

Both entries call the shared `bootstrap()` in `frontend-vue/src/bootstrap.ts`, which creates the Vue app with Pinia + Vue Router. The `auth.isAdminApp()` store getter reads `window.__MEETING_ADMIN_APP__` to determine context.

### Routing (hash-based)

All routes are in `frontend-vue/src/router/index.ts`:
- **User routes**: `/login`, `/home`, `/rooms`, `/rooms/:id`, `/bookings/new`, `/bookings/my`, `/calendar`
- **Admin routes** (require staff role): `/admin/bookings`, `/admin/approvals`, `/admin/stats`, `/admin/users`, `/admin/rooms`
- Route guards check `requiresAuth`, `requiresStaff`, `requiresAdmin` meta flags
- `APPROVER` role cannot access room management or stats; `ADMIN` has full access

### Backend Structure

```
backend-spring/src/main/java/com/meeting/backend/
├── MeetingApplication.java          # Spring Boot entry
├── common/
│   ├── ApiResponse.java             # { code, message, data, total } record
│   ├── AppException.java            # Runtime exception with code + HTTP status
│   ├── ApiExceptionHandler.java     # @RestControllerAdvice — maps exceptions to ApiResponse
│   ├── ErrorCodes.java              # 0=success, 40001=bad request, 40101=unauth, 40301=forbidden, 4090x=conflict
│   └── RequestUser.java            # Parsed JWT user (id, username, name, email, collegeCode, role, status)
├── config/
│   ├── SecurityConfig.java          # CSRF disabled, CORS enabled, all requests permitted
│   └── WebConfig.java               # CORS mapping for /api/**
├── security/
│   ├── JwtService.java              # JWT generation/parsing with HMAC-SHA256
│   └── WerkzeugPasswordService.java # Scrypt password check (backward compat with old Flask hashes)
├── controller/                      # @RestController classes
│   ├── HealthController.java        # GET /api/health
│   ├── AuthController.java          # POST /api/auth/login
│   ├── RoomController.java          # GET /api/rooms, /api/rooms/available, /api/rooms/{id}/schedule
│   ├── BookingController.java       # POST /api/bookings, GET /api/bookings/my, etc.
│   ├── AdminController.java         # CRUD rooms, users, bookings, stats, approve/reject
│   ├── ApprovalController.java      # GET /api/approvals/pending, statistics
│   └── NotificationController.java  # Notifications CRUD
└── service/
    ├── AuthService.java             # Login, requireAuth/requireAdmin/requireStaff (manual auth check)
    ├── RoomService.java             # Room queries, availability, conflict detection, visibility filtering
    ├── BookingService.java          # Create/cancel/checkin/approve/reject with full validation
    ├── StatsService.java            # Dashboard statistics
    └── NotificationService.java     # Notification management
```

### Auth Model

- No Spring Security filters; auth is checked **manually** in each controller via `AuthService.requireAuth(request)`, `.requireAdmin(request)`, `.requireStaff(request)`
- These methods extract the Bearer token, parse the JWT, look up the user in SQLite, and throw `AppException` (caught by `ApiExceptionHandler`) if invalid
- Three roles: `USER`, `APPROVER`, `ADMIN`. Staff = ADMIN | APPROVER.
- `APPROVER` can access admin views but only approve/reject bookings for rooms where they are the designated approver (`rooms.approver_user_id`)

### Database

SQLite at `backend/meeting.db` (relative to `backend-spring/`, the JDBC URL is `jdbc:sqlite:../backend/meeting.db`). Key schema points:
- `users` — role column (USER/APPROVER/ADMIN), password_hash (Werkzeug scrypt), college_code
- `rooms` — requires_approval, approver_user_id, visibility_scope (ALL/COLLEGES), weekday/weekend open hours
- `room_facilities` — many-to-many room ↔ facility codes
- `room_visible_colleges` — college whitelist when visibility_scope=COLLEGES
- `bookings` — status flow: PENDING_APPROVAL → BOOKED → CHECKED_IN → IN_USE → FINISHED; terminal: CANCELED, REJECTED, EXPIRED
- `booking_rules` — max_advance_days, min/max_duration_minutes, business_start/end_hour
- `room_maintenance` — maintenance time ranges
- `notifications`, `colleges`

### API Convention

- Prefix: `/api`, responses: `{ code: 0, message, data, total? }`
- **Always check `code`**, not HTTP status — many business errors return HTTP 200
- Snake_case in DB/API responses, camelCase in frontend — mapping functions `mapRoom()`, `mapBooking()`, `mapStats()` in `frontend-vue/src/api/client.ts`
- API base URL auto-detected from `window.location`, overridable via `localStorage.setItem('MEETING_API_BASE', '...')`

### Booking Conflict Rules

Conflicting statuses: `PENDING_APPROVAL`, `BOOKED`, `CHECKED_IN`, `IN_USE`. Conflict = same room + `newStart < existEnd AND newEnd > existStart`. Also checks maintenance periods and room status != AVAILABLE.
