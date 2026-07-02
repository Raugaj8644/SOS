# Community Emergency Response Platform — System Architecture
## Phase 1: Architecture Design

---

## 1. System Overview

The Community Emergency Response Platform (CERP) is a **multi-tenant, real-time emergency coordination system**. Organizations (tenants) create isolated geographic "Areas." Within each Area, users can trigger SOS alerts, coordinate response, and visualize incidents on a live map — all in real time.

The architecture is designed around three non-negotiable constraints:
1. **Hard Area isolation** — no data, events, or notifications can bleed between Areas
2. **Real-time reliability** — SOS must propagate to all users in under 2 seconds
3. **Horizontal scalability** — the system must scale without re-architecture

---

## 2. Architecture Pattern

**Pattern: Modular Monolith → Event-Driven Services**

We start as a well-structured modular monolith (NestJS modules) with an internal event bus (BullMQ over Redis). This lets us move fast now and extract hot modules into microservices later without a re-write. The WebSocket layer is already decoupled via a Redis adapter, so scaling is possible on day one.

```
Client Layer         →  Next.js (SSR + CSR)
API Layer            →  NestJS REST + WebSocket Gateway
Event Bus            →  BullMQ (Redis)
Data Layer           →  PostgreSQL + PostGIS + Redis
File Storage         →  S3-compatible (MinIO / AWS S3)
Push Notifications   →  Firebase Cloud Messaging
Edge / Proxy         →  Nginx
```

---

## 3. Component Architecture

### 3.1 Frontend — Next.js 14+ (App Router)

```
apps/web/
├── app/
│   ├── (auth)/               # login, register, forgot-password
│   ├── (app)/                # authenticated shell
│   │   ├── dashboard/        # user home — nearby areas
│   │   ├── areas/
│   │   │   ├── [areaId]/
│   │   │   │   ├── map/      # live map view
│   │   │   │   ├── incidents/
│   │   │   │   └── join/     # QR / invitation landing
│   │   ├── admin/
│   │   │   ├── areas/        # area management
│   │   │   ├── incidents/    # incident history
│   │   │   ├── analytics/
│   │   │   └── broadcasts/
│   │   └── profile/
│   └── api/                  # Next.js Route Handlers (BFF thin layer)
├── components/
│   ├── map/                  # Leaflet wrappers
│   ├── sos/                  # SOS button + flow
│   ├── incidents/
│   ├── notifications/
│   └── ui/                   # ShadCN re-exports + custom
├── hooks/
│   ├── useGeolocation.ts
│   ├── useSocket.ts
│   ├── useArea.ts
│   └── useIncidents.ts
├── lib/
│   ├── api.ts                # Axios instance with interceptors
│   ├── socket.ts             # Socket.IO client singleton
│   └── fcm.ts                # Firebase client SDK
├── stores/                   # Zustand global state
│   ├── authStore.ts
│   ├── areaStore.ts
│   └── incidentStore.ts
└── types/                    # Re-exports from @cerp/shared
```

**Key Frontend Decisions:**
- **App Router** with React Server Components for SSR pages (dashboard, area list, analytics). Interactive map/SOS are Client Components.
- **Zustand** (not Redux) — lighter, TypeScript-native, no boilerplate
- **Axios with interceptors** — automatic token refresh on 401, request/response logging
- **Dynamic import** for Leaflet — SSR-incompatible, loaded client-side only
- **Service Worker** — handles FCM background push notifications in browser

### 3.2 Backend — NestJS (Modular Monolith)

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   └── guards/
│   │   │       ├── jwt-auth.guard.ts
│   │   │       └── roles.guard.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── entities/user.entity.ts
│   │   ├── areas/
│   │   │   ├── areas.module.ts
│   │   │   ├── areas.controller.ts
│   │   │   ├── areas.service.ts
│   │   │   ├── area-membership.service.ts
│   │   │   └── entities/
│   │   │       ├── area.entity.ts
│   │   │       └── area-membership.entity.ts
│   │   ├── safe-points/
│   │   │   ├── safe-points.module.ts
│   │   │   ├── safe-points.controller.ts
│   │   │   ├── safe-points.service.ts
│   │   │   └── entities/safe-point.entity.ts
│   │   ├── incidents/
│   │   │   ├── incidents.module.ts
│   │   │   ├── incidents.controller.ts
│   │   │   ├── incidents.service.ts
│   │   │   ├── incidents.gateway.ts    # WebSocket events
│   │   │   ├── incidents.processor.ts  # BullMQ worker
│   │   │   └── entities/
│   │   │       ├── incident.entity.ts
│   │   │       ├── incident-update.entity.ts
│   │   │       └── incident-responder.entity.ts
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── fcm.service.ts
│   │   │   └── entities/notification.entity.ts
│   │   ├── media/
│   │   │   ├── media.module.ts
│   │   │   ├── media.controller.ts
│   │   │   ├── media.service.ts
│   │   │   └── s3.service.ts
│   │   └── analytics/
│   │       ├── analytics.module.ts
│   │       ├── analytics.controller.ts
│   │       └── analytics.service.ts
│   ├── common/
│   │   ├── guards/
│   │   │   └── area-member.guard.ts    # Area isolation enforcement
│   │   ├── interceptors/
│   │   │   ├── audit-log.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── area-id.decorator.ts
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts
│   │   └── middleware/
│   │       └── rate-limit.middleware.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   └── s3.config.ts
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── events/
│   │   └── event-types.ts             # Typed BullMQ job payloads
│   └── main.ts
```

**Key Backend Decisions:**
- **NestJS modules** map 1:1 to domains. No cross-module direct imports — modules communicate via NestJS events or BullMQ jobs.
- **TypeORM** with PostgreSQL + PostGIS for geospatial queries (`ST_Contains`, `ST_Distance`, `ST_DWithin`)
- **BullMQ** for async jobs: FCM dispatch, audit log writes, report generation — these never block the request thread
- **Socket.IO with `@socket.io/redis-adapter`** — allows N API instances to share WebSocket state
- **Zod** for DTO validation (not `class-validator`) — Zod schemas live in `packages/shared` and are reused on the frontend

### 3.3 Shared Package

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.types.ts
│   │   ├── area.types.ts
│   │   ├── incident.types.ts
│   │   └── notification.types.ts
│   ├── schemas/              # Zod schemas (validated on both sides)
│   │   ├── auth.schema.ts
│   │   ├── area.schema.ts
│   │   ├── incident.schema.ts
│   │   └── safe-point.schema.ts
│   ├── constants/
│   │   ├── incident-types.ts
│   │   ├── safe-point-types.ts
│   │   └── socket-events.ts  # Typed socket event names
│   └── utils/
│       ├── geo.utils.ts      # Client-side geo helpers
│       └── date.utils.ts
└── package.json
```

---

## 4. Data Flow Architecture

### 4.1 SOS Trigger Flow (Critical Path)

```
User (mobile/browser)
  │
  ├─[1] Hold SOS button 3 seconds
  ├─[2] Capture GPS coordinates (browser Geolocation API)
  ├─[3] POST /api/areas/:areaId/incidents
  │       (with JWT, GPS, optional type + media)
  │
  └── NestJS API (IncidentsController)
        │
        ├─[4] Validate JWT → extract userId
        ├─[5] AreaMemberGuard: verify user is member of areaId
        ├─[6] Verify GPS coordinates fall inside Area polygon (PostGIS ST_Contains)
        ├─[7] Write incident to PostgreSQL (status: ACTIVE)
        ├─[8] Return 201 to client (fast response, <100ms)
        │
        └─[9] Emit BullMQ job: "incident.created" { incidentId, areaId }
               │
               ├── [Worker A] NotificationsProcessor
               │     ├─ Load all area member FCM tokens from DB
               │     └─ Batch send FCM push notifications
               │
               ├── [Worker B] WebSocketProcessor
               │     └─ Emit Socket.IO event to room `area:${areaId}`
               │           → All connected clients receive incident payload
               │
               └── [Worker C] AuditLogProcessor
                     └─ Write immutable audit log entry
```

### 4.2 Area Isolation Model

Every database query is scoped to `area_id`. This is enforced at three layers:

```
Layer 1 — HTTP Guard:
  AreaMemberGuard checks JWT userId ∈ area_members(area_id)

Layer 2 — Service Layer:
  Every service method accepts (areaId, userId) and appends
  WHERE area_id = $areaId to all queries.

Layer 3 — Database:
  Row-Level Security policies on sensitive tables (incidents, safe_points)
  enforce area_id scoping even if application code is bypassed.
```

### 4.3 Real-Time Connection Flow

```
Client connects to WebSocket
  │
  ├─ Authenticates with JWT handshake (auth middleware on gateway)
  ├─ Server validates token, extracts userId + areaIds
  └─ Server joins client to Socket.IO rooms:
       room: `area:${areaId}` for each active area membership

Event arrives (e.g., new SOS):
  BullMQ Worker → Redis Pub/Sub → Socket.IO Redis Adapter
    → All API instances broadcast to room `area:${areaId}`
    → Every connected member receives the event
```

---

## 5. Infrastructure Architecture

```
                            ┌─────────────────┐
                            │   Nginx (Edge)   │
                            │ SSL + Rate Limit │
                            └────────┬────────┘
                   ┌─────────────────┴──────────────────┐
                   │                                    │
           ┌───────┴──────┐                   ┌────────┴───────┐
           │  Next.js App  │                   │  NestJS API    │
           │  (port 3000)  │                   │  (port 4000)   │
           └───────────────┘                   └───────┬────────┘
                                                       │
                        ┌──────────────────────────────┼────────────────────┐
                        │                              │                    │
               ┌────────┴───────┐           ┌─────────┴──────┐    ┌────────┴────────┐
               │  PostgreSQL    │           │     Redis       │    │  MinIO / S3     │
               │  + PostGIS     │           │  (Cache/Queue/  │    │  (Media Files)  │
               │  (port 5432)   │           │   PubSub)       │    │  (port 9000)    │
               └────────────────┘           └────────────────┘    └─────────────────┘
                                                       │
                                           ┌───────────┴──────────┐
                                           │   Firebase (External) │
                                           │   Cloud Messaging     │
                                           └──────────────────────┘
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
Register/Login → bcrypt(password) → Issue:
  - Access Token  (JWT, 15 min, signed with RS256)
  - Refresh Token (opaque UUID, 7 days, stored in DB + HttpOnly cookie)

Request → Bearer access token in Authorization header
        → If expired: POST /auth/refresh (uses HttpOnly cookie)
        → Refresh token rotated on every use
        → Old refresh token invalidated in Redis (blacklist)

Logout  → Refresh token deleted from DB
        → Access token added to Redis blacklist (TTL = remaining JWT lifetime)
```

### 6.2 Role-Based Access Control

```
Roles:
  ADMIN  — can manage the Area they own/admin
  USER   — can view and interact within joined Areas

Guards (applied in order):
  1. JwtAuthGuard     — validates Bearer token
  2. RolesGuard       — checks @Roles() decorator on handler
  3. AreaMemberGuard  — verifies membership + role in specific Area
```

### 6.3 Rate Limiting Strategy

```
Global:           100 req/min per IP
Auth endpoints:    10 req/min per IP (brute-force protection)
SOS endpoint:       5 req/min per user (anti-spam)
Media upload:      20 req/min per user
```

---

## 7. Geospatial Architecture

All geospatial operations use **PostGIS** (PostgreSQL extension):

| Operation | PostGIS Function | Use Case |
|---|---|---|
| Area containment | `ST_Contains(polygon, point)` | Verify SOS is inside area |
| User proximity | `ST_DWithin(point_a, point_b, meters)` | "Nearby Areas" detection |
| Distance display | `ST_Distance(point_a, point_b)` | Show distance to incident |
| Polygon storage | `geometry(Polygon, 4326)` | Area boundaries |
| Point storage | `geometry(Point, 4326)` | User locations, safe points |

Coordinate system: **WGS84 (EPSG:4326)** — standard GPS coordinates used by the browser Geolocation API and OpenStreetMap.

---

## 8. Complete Monorepo Folder Structure

```
cerp/                                   # Root monorepo
├── apps/
│   ├── web/                            # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── register/
│   │   │   │   │   └── forgot-password/
│   │   │   │   └── (app)/
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── dashboard/
│   │   │   │       ├── areas/
│   │   │   │       │   └── [areaId]/
│   │   │   │       │       ├── map/
│   │   │   │       │       ├── incidents/
│   │   │   │       │       └── join/
│   │   │   │       ├── admin/
│   │   │   │       │   ├── areas/
│   │   │   │       │   ├── incidents/
│   │   │   │       │   ├── analytics/
│   │   │   │       │   └── broadcasts/
│   │   │   │       └── profile/
│   │   │   ├── components/
│   │   │   │   ├── map/
│   │   │   │   │   ├── AreaMap.tsx
│   │   │   │   │   ├── PolygonDrawer.tsx
│   │   │   │   │   ├── SafePointMarker.tsx
│   │   │   │   │   └── IncidentMarker.tsx
│   │   │   │   ├── sos/
│   │   │   │   │   ├── SosButton.tsx
│   │   │   │   │   ├── SosModal.tsx
│   │   │   │   │   └── SosConfirmation.tsx
│   │   │   │   ├── incidents/
│   │   │   │   │   ├── IncidentCard.tsx
│   │   │   │   │   ├── IncidentFeed.tsx
│   │   │   │   │   └── ResponderList.tsx
│   │   │   │   ├── notifications/
│   │   │   │   │   └── NotificationBell.tsx
│   │   │   │   └── ui/                 # ShadCN + custom
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── stores/
│   │   │   └── types/
│   │   ├── public/
│   │   │   └── firebase-messaging-sw.js
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                            # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── areas/
│       │   │   ├── safe-points/
│       │   │   ├── incidents/
│       │   │   ├── notifications/
│       │   │   ├── media/
│       │   │   └── analytics/
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── pipes/
│       │   │   └── middleware/
│       │   ├── config/
│       │   ├── database/
│       │   │   ├── migrations/
│       │   │   └── seeds/
│       │   └── main.ts
│       ├── test/
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                         # Shared types + Zod schemas
│       ├── src/
│       │   ├── types/
│       │   ├── schemas/
│       │   ├── constants/
│       │   └── utils/
│       ├── tsconfig.json
│       └── package.json
│
├── infrastructure/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/
│   ├── postgres/
│   │   └── init.sql                    # PostGIS extension setup
│   └── minio/
│       └── init.sh
│
├── docker-compose.yml                  # Development
├── docker-compose.prod.yml             # Production
├── .env.example
├── turbo.json                          # Turborepo config
├── package.json                        # Root workspace
└── tsconfig.base.json                  # Shared TS config
```

---

## 9. API Route Map (High Level)

```
AUTH
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout
  GET    /api/auth/me

AREAS
  POST   /api/areas                          (Admin)
  GET    /api/areas                          (discover nearby — public)
  GET    /api/areas/:areaId
  PATCH  /api/areas/:areaId                  (Admin)
  DELETE /api/areas/:areaId                  (Admin)
  GET    /api/areas/:areaId/qr-code          (Admin)
  POST   /api/areas/:areaId/join             (User — via QR/invite/geo)
  DELETE /api/areas/:areaId/members/:userId  (Admin)

SAFE POINTS
  POST   /api/areas/:areaId/safe-points      (Admin)
  GET    /api/areas/:areaId/safe-points
  PATCH  /api/areas/:areaId/safe-points/:id  (Admin)
  DELETE /api/areas/:areaId/safe-points/:id  (Admin)

INCIDENTS
  POST   /api/areas/:areaId/incidents        (User — SOS trigger)
  GET    /api/areas/:areaId/incidents
  GET    /api/areas/:areaId/incidents/:id
  PATCH  /api/areas/:areaId/incidents/:id/close   (incident creator only)
  POST   /api/areas/:areaId/incidents/:id/respond (User)
  POST   /api/areas/:areaId/incidents/:id/updates (User — post update)

NOTIFICATIONS
  GET    /api/notifications                  (User — own notifications)
  PATCH  /api/notifications/:id/read
  POST   /api/notifications/fcm-token        (register device token)

BROADCASTS
  POST   /api/areas/:areaId/broadcasts       (Admin)
  GET    /api/areas/:areaId/broadcasts

ANALYTICS
  GET    /api/areas/:areaId/analytics        (Admin)
  GET    /api/areas/:areaId/analytics/export (Admin — CSV/PDF)

MEDIA
  POST   /api/media/upload                   (presigned S3 URL)

WEBSOCKET EVENTS (Socket.IO)
  Client → Server:
    join_area         { areaId }
    leave_area        { areaId }

  Server → Client:
    incident:created  { incident }
    incident:updated  { incident }
    incident:closed   { incidentId }
    broadcast:new     { broadcast }
    area:alert        { message }
```

---

## 10. Environment Variables

```env
# App
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://cerp:cerp_pass@localhost:5432/cerp_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT (RS256 — use actual RSA key pair in production)
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio_access
S3_SECRET_KEY=minio_secret
S3_BUCKET=cerp-media
S3_REGION=us-east-1

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Next.js Public
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
```

---

## 11. Key Architecture Decisions — Summary

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo | Turborepo | Shared types, unified CI, zero drift between front/back DTOs |
| Backend framework | NestJS | Structured, decorator-driven, plays well with TypeScript DI |
| ORM | TypeORM | PostGIS geometry types supported; raw query escape hatch |
| Geospatial DB | PostGIS | Industry standard; ST_Contains for polygon checks is a single indexed query |
| Real-time | Socket.IO + Redis adapter | Scales horizontally; rooms map cleanly to Areas |
| Job queue | BullMQ | Redis-backed, retries, priority, monitoring (Bull Board) |
| Validation | Zod | Shared schemas between FE and BE; superior TypeScript inference |
| State mgmt | Zustand | Minimal boilerplate; enough for this scale |
| Auth | JWT (RS256) + refresh rotation | Stateless access tokens; revocable refresh tokens |
| File storage | S3-compatible | Presigned URL pattern keeps files off API server |
| Notifications | FCM + WebSockets | FCM for background/offline; WS for foreground real-time |

---

*Phase 1 Complete. Awaiting approval to proceed to Phase 2: Database Design.*
