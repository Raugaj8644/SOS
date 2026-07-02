# Phase 2: Database Design

## Stack
- **PostgreSQL 15+** with extensions: `uuid-ossp`, `postgis`, `pg_trgm`, `btree_gist`
- **TypeORM** with migration-based schema management (never `synchronize: true`)
- **PostGIS** for all geospatial columns and queries

---

## Entity Relationship Overview

```
users
 ├── area_memberships  (user ↔ area, with role: admin|user)
 ├── refresh_tokens    (JWT refresh token rotation)
 ├── notifications     (per-user inbox)
 └── audit_logs        (every action the user takes)

areas
 ├── area_memberships  (members of this area)
 ├── area_invitations  (invite codes / QR tokens)
 ├── safe_points       (toilets, medical, exits, etc.)
 ├── incidents         (active SOS events)
 └── broadcasts        (admin messages to all members)

incidents
 ├── incident_updates   (timeline of updates / status changes)
 ├── incident_responders (users who confirmed they are responding)
 └── incident_media     (attached photos/videos)
```

---

## Tables Summary

| Table | Rows (est.) | Key Columns | Notes |
|---|---|---|---|
| `users` | 100K | email, password_hash, fcm_token | Unique on LOWER(email) |
| `areas` | 10K | polygon (geometry), qr_token, centroid | PostGIS Polygon + auto-centroid trigger |
| `area_memberships` | 500K | area_id, user_id, role | Unique (area_id, user_id) |
| `area_invitations` | 50K | code, max_uses, expires_at | Single-use or multi-use codes |
| `safe_points` | 100K | location (geometry Point), type | PostGIS Point, GiST indexed |
| `incidents` | 200K | location, status, type, severity | GiST indexed, area scoped |
| `incident_updates` | 1M | incident_id, message | Timeline feed |
| `incident_responders` | 500K | responder_location, distance_meters | Unique (incident_id, user_id) |
| `incident_media` | 300K | s3_key, virus_scanned, is_safe | ClamAV integration |
| `notifications` | 2M | user_id, is_read, data (jsonb) | Per-user inbox |
| `broadcasts` | 20K | priority, recipient_count | Admin-to-all messages |
| `refresh_tokens` | 200K | token_hash, is_revoked, expires_at | Rotation on every use |
| `audit_logs` | 5M+ | action, entity_type, old/new_value | Append-only (DB trigger) |

---

## Key Geospatial Queries

```sql
-- 1. Check if SOS location is inside an Area (server validation)
SELECT id FROM areas
WHERE id = $1
  AND ST_Contains(polygon, ST_SetSRID(ST_Point($lon, $lat), 4326));

-- 2. Find Areas within 500m of user (discovery)
SELECT id, name, type,
       ST_Distance(centroid::geography, ST_SetSRID(ST_Point($lon, $lat), 4326)::geography) AS distance_m
FROM areas
WHERE is_active = TRUE
  AND is_public = TRUE
  AND ST_DWithin(centroid::geography, ST_SetSRID(ST_Point($lon, $lat), 4326)::geography, 500)
ORDER BY distance_m ASC
LIMIT 20;

-- 3. Distance from user to incident (display on map)
SELECT i.id,
       ST_Distance(
         i.location::geography,
         ST_SetSRID(ST_Point($lon, $lat), 4326)::geography
       ) AS distance_meters
FROM incidents i
WHERE i.area_id = $areaId
  AND i.status = 'active';

-- 4. Nearest safe point of a given type to an incident
SELECT sp.id, sp.name, sp.type,
       ST_Distance(sp.location::geography, i.location::geography) AS distance_m
FROM safe_points sp, incidents i
WHERE i.id = $incidentId
  AND sp.area_id = i.area_id
  AND sp.type = $type
  AND sp.is_active = TRUE
ORDER BY sp.location <-> i.location   -- uses GiST index (k-NN)
LIMIT 5;
```

---

## Files Generated

```
apps/api/src/
├── config/
│   └── database.config.ts
├── database/
│   ├── data-source.ts                         (TypeORM CLI)
│   └── migrations/
│       └── 1700000001-InitialSchema.ts        (full schema)
└── modules/
    ├── users/entities/user.entity.ts
    ├── areas/entities/
    │   ├── area.entity.ts
    │   ├── area-membership.entity.ts
    │   └── area-invitation.entity.ts
    ├── safe-points/entities/safe-point.entity.ts
    ├── incidents/entities/
    │   ├── incident.entity.ts
    │   ├── incident-update.entity.ts
    │   ├── incident-responder.entity.ts
    │   └── incident-media.entity.ts
    ├── notifications/entities/notification.entity.ts
    ├── analytics/entities/broadcast.entity.ts
    ├── auth/entities/refresh-token.entity.ts
    └── common/entities/audit-log.entity.ts
```

---

*Phase 2 Complete. Ready for Phase 3: Backend APIs.*
