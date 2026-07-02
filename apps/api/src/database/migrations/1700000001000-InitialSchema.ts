import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Schema Migration
 *
 * Creates all tables for the Community Emergency Response Platform.
 * Requires the PostGIS extension to be installed on the PostgreSQL server.
 *
 * Run: npx typeorm migration:run -d src/database/data-source.ts
 */
export class InitialSchema1700000001000 implements MigrationInterface {
  name = 'InitialSchema1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────────────────────────────────────────
    // 0. EXTENSIONS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`); // fuzzy text search
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`); // compound GiST indexes

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ENUM TYPES
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE global_role AS ENUM ('super_admin', 'user')
    `);

    await queryRunner.query(`
      CREATE TYPE area_type AS ENUM (
        'university', 'school', 'company', 'concert', 'camp',
        'marathon', 'community', 'open_house', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE area_role AS ENUM ('admin', 'user')
    `);

    await queryRunner.query(`
      CREATE TYPE join_method AS ENUM ('qr_code', 'invite', 'geo', 'manual')
    `);

    await queryRunner.query(`
      CREATE TYPE safe_point_type AS ENUM (
        'toilet', 'medical_station', 'food_court', 'emergency_exit',
        'assembly_point', 'water_station', 'parking', 'aed',
        'fire_extinguisher', 'information', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE incident_type AS ENUM (
        'medical_emergency', 'injury', 'fire', 'violence',
        'missing_person', 'suspicious_activity', 'other', 'emergency'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE incident_status AS ENUM ('active', 'resolved', 'closed', 'false')
    `);

    await queryRunner.query(`
      CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical')
    `);

    await queryRunner.query(`
      CREATE TYPE update_type AS ENUM (
        'status_change', 'user_update', 'admin_note', 'responder'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE media_type AS ENUM ('photo', 'video')
    `);

    await queryRunner.query(`
      CREATE TYPE notification_type AS ENUM (
        'sos', 'incident_update', 'incident_closed', 'broadcast',
        'area_update', 'safety_alert', 'member_joined', 'system'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE broadcast_priority AS ENUM ('low', 'normal', 'high', 'critical')
    `);

    await queryRunner.query(`
      CREATE TYPE audit_action AS ENUM (
        'login', 'logout', 'register', 'password_change', 'token_refresh', 'account_locked',
        'area_create', 'area_update', 'area_delete', 'area_join', 'area_leave', 'member_removed',
        'incident_create', 'incident_update', 'incident_close', 'incident_respond', 'incident_flag',
        'safe_point_create', 'safe_point_update', 'safe_point_delete',
        'broadcast_send', 'report_export'
      )
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. USERS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE users (
        id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email                 VARCHAR(255) NOT NULL,
        password_hash         VARCHAR(255) NOT NULL,
        name                  VARCHAR(100) NOT NULL,
        avatar_url            VARCHAR(500),
        fcm_token             VARCHAR(500),
        role                  global_role NOT NULL DEFAULT 'user',
        is_active             BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
        failed_login_attempts INT NOT NULL DEFAULT 0,
        locked_until          TIMESTAMPTZ,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ux_users_email ON users (LOWER(email))`);
    await queryRunner.query(`CREATE INDEX ix_users_role ON users (role)`);
    await queryRunner.query(`CREATE INDEX ix_users_is_active ON users (is_active)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. AREAS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE areas (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name             VARCHAR(150) NOT NULL,
        description      TEXT,
        type             area_type NOT NULL DEFAULT 'other',
        polygon          geometry(Polygon, 4326),
        centroid         geometry(Point, 4326),
        qr_token         VARCHAR(64) NOT NULL,
        invite_code      VARCHAR(20) NOT NULL,
        is_public        BOOLEAN NOT NULL DEFAULT TRUE,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at       TIMESTAMPTZ,
        max_members      INT,
        logo_url         VARCHAR(500),
        contact_email    VARCHAR(255),
        emergency_phone  VARCHAR(30),
        created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ux_areas_qr_token ON areas (qr_token)`);
    await queryRunner.query(`CREATE UNIQUE INDEX ux_areas_invite_code ON areas (invite_code)`);
    await queryRunner.query(`CREATE INDEX ix_areas_is_active ON areas (is_active)`);
    await queryRunner.query(`CREATE INDEX ix_areas_created_by ON areas (created_by)`);
    // GiST indexes for spatial queries
    await queryRunner.query(`CREATE INDEX gix_areas_polygon  ON areas USING GIST (polygon)`);
    await queryRunner.query(`CREATE INDEX gix_areas_centroid ON areas USING GIST (centroid)`);
    // Trigram index for fuzzy area name search
    await queryRunner.query(`CREATE INDEX trgm_areas_name ON areas USING GIN (name gin_trgm_ops)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. AREA MEMBERSHIPS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE area_memberships (
        id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        area_id                 UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role                    area_role NOT NULL DEFAULT 'user',
        join_method             join_method NOT NULL DEFAULT 'manual',
        is_active               BOOLEAN NOT NULL DEFAULT TRUE,
        left_at                 TIMESTAMPTZ,
        notifications_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
        invited_by              UUID REFERENCES users(id) ON DELETE SET NULL,
        joined_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_area_user UNIQUE (area_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_memberships_area_id ON area_memberships (area_id)`);
    await queryRunner.query(`CREATE INDEX ix_memberships_user_id ON area_memberships (user_id)`);
    await queryRunner.query(`CREATE INDEX ix_memberships_active ON area_memberships (area_id, is_active)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. AREA INVITATIONS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE area_invitations (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        area_id     UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code        VARCHAR(64) NOT NULL,
        email       VARCHAR(255),
        max_uses    INT,
        use_count   INT NOT NULL DEFAULT 0,
        expires_at  TIMESTAMPTZ,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_invitation_code UNIQUE (code)
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ux_invitations_code ON area_invitations (code)`);
    await queryRunner.query(`CREATE INDEX ix_invitations_area_id ON area_invitations (area_id)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 6. SAFE POINTS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE safe_points (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        area_id     UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        name        VARCHAR(150) NOT NULL,
        type        safe_point_type NOT NULL DEFAULT 'other',
        description TEXT,
        location    geometry(Point, 4326) NOT NULL,
        floor       VARCHAR(50),
        metadata    JSONB,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_safe_points_area_id ON safe_points (area_id)`);
    await queryRunner.query(`CREATE INDEX ix_safe_points_type ON safe_points (area_id, type)`);
    await queryRunner.query(`CREATE INDEX gix_safe_points_location ON safe_points USING GIST (location)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 7. INCIDENTS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE incidents (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        area_id           UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        created_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        closed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
        type              incident_type NOT NULL DEFAULT 'emergency',
        status            incident_status NOT NULL DEFAULT 'active',
        severity          incident_severity NOT NULL DEFAULT 'high',
        location          geometry(Point, 4326) NOT NULL,
        location_accuracy FLOAT,
        description       TEXT,
        metadata          JSONB,
        responder_count   INT NOT NULL DEFAULT 0,
        resolved_at       TIMESTAMPTZ,
        close_reason      TEXT,
        spam_score        FLOAT NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_incidents_area_id ON incidents (area_id)`);
    await queryRunner.query(`CREATE INDEX ix_incidents_created_by ON incidents (created_by)`);
    await queryRunner.query(`CREATE INDEX ix_incidents_status ON incidents (area_id, status)`);
    await queryRunner.query(`CREATE INDEX ix_incidents_type ON incidents (area_id, type)`);
    await queryRunner.query(`CREATE INDEX ix_incidents_created_at ON incidents (area_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX gix_incidents_location ON incidents USING GIST (location)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 8. INCIDENT UPDATES
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE incident_updates (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        area_id         UUID NOT NULL,       -- denormalised
        created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        type            update_type NOT NULL DEFAULT 'user_update',
        message         TEXT NOT NULL,
        previous_status VARCHAR(50),
        new_status      VARCHAR(50),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_inc_updates_incident_id ON incident_updates (incident_id)`);
    await queryRunner.query(`CREATE INDEX ix_inc_updates_area_id ON incident_updates (area_id)`);
    await queryRunner.query(`CREATE INDEX ix_inc_updates_created_at ON incident_updates (incident_id, created_at DESC)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 9. INCIDENT RESPONDERS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE incident_responders (
        id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id        UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        area_id            UUID NOT NULL,   -- denormalised
        user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        responder_location geometry(Point, 4326),
        distance_meters    FLOAT,
        has_arrived        BOOLEAN NOT NULL DEFAULT FALSE,
        arrived_at         TIMESTAMPTZ,
        responded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_incident_responder UNIQUE (incident_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_responders_incident_id ON incident_responders (incident_id)`);
    await queryRunner.query(`CREATE INDEX ix_responders_user_id ON incident_responders (user_id)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 10. INCIDENT MEDIA
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE incident_media (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        area_id       UUID NOT NULL,        -- denormalised
        uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        type          media_type NOT NULL DEFAULT 'photo',
        s3_key        VARCHAR(500) NOT NULL,
        file_name     VARCHAR(255) NOT NULL,
        mime_type     VARCHAR(100) NOT NULL,
        size_bytes    INT NOT NULL,
        thumbnail_key VARCHAR(500),
        virus_scanned BOOLEAN NOT NULL DEFAULT FALSE,
        is_safe       BOOLEAN,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_inc_media_incident_id ON incident_media (incident_id)`);
    await queryRunner.query(`CREATE INDEX ix_inc_media_area_id ON incident_media (area_id)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 11. NOTIFICATIONS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE notifications (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        area_id     UUID,
        type        notification_type NOT NULL,
        title       VARCHAR(200) NOT NULL,
        body        TEXT NOT NULL,
        data        JSONB,
        is_read     BOOLEAN NOT NULL DEFAULT FALSE,
        read_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_notifications_user_id ON notifications (user_id, is_read, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX ix_notifications_area_id ON notifications (area_id)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 12. BROADCASTS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE broadcasts (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        area_id          UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title            VARCHAR(200) NOT NULL,
        message          TEXT NOT NULL,
        priority         broadcast_priority NOT NULL DEFAULT 'normal',
        recipient_count  INT NOT NULL DEFAULT 0,
        scheduled_at     TIMESTAMPTZ,
        sent_at          TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_broadcasts_area_id ON broadcasts (area_id, created_at DESC)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 13. REFRESH TOKENS
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash   VARCHAR(255) NOT NULL,
        user_agent   TEXT,
        ip_address   VARCHAR(45),
        device_name  VARCHAR(100),
        expires_at   TIMESTAMPTZ NOT NULL,
        is_revoked   BOOLEAN NOT NULL DEFAULT FALSE,
        revoked_at   TIMESTAMPTZ,
        replaced_by  VARCHAR(36),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ux_refresh_tokens_hash ON refresh_tokens (token_hash)`);
    await queryRunner.query(`CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id, is_revoked)`);
    await queryRunner.query(`CREATE INDEX ix_refresh_tokens_expires ON refresh_tokens (expires_at)`); // for cleanup job

    // ──────────────────────────────────────────────────────────────────────────
    // 14. AUDIT LOGS  (append-only)
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
        area_id      UUID,
        action       audit_action NOT NULL,
        entity_type  VARCHAR(50),
        entity_id    VARCHAR(36),
        old_value    JSONB,
        new_value    JSONB,
        ip_address   VARCHAR(45),
        user_agent   TEXT,
        metadata     JSONB,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX ix_audit_logs_area_id ON audit_logs (area_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX ix_audit_logs_entity ON audit_logs (entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX ix_audit_logs_action ON audit_logs (action, created_at DESC)`);

    // ──────────────────────────────────────────────────────────────────────────
    // 15. TRIGGERS
    // ──────────────────────────────────────────────────────────────────────────

    // Auto-update updated_at timestamps
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trigger_set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const table of ['users', 'areas', 'safe_points', 'incidents']) {
      await queryRunner.query(`
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
      `);
    }

    // Prevent UPDATE/DELETE on audit_logs (append-only enforcement)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs is append-only: updates and deletes are not allowed';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER enforce_audit_immutability
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation()
    `);

    // Auto-compute centroid when polygon is saved/updated
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trigger_compute_centroid()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.polygon IS NOT NULL THEN
          NEW.centroid = ST_Centroid(NEW.polygon);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER compute_area_centroid
      BEFORE INSERT OR UPDATE OF polygon ON areas
      FOR EACH ROW EXECUTE FUNCTION trigger_compute_centroid()
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 16. ROW-LEVEL SECURITY (RLS)
    //     Enforces area isolation at the database level.
    //     Application uses a dedicated DB role 'cerp_app' (not superuser).
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      -- Enable RLS on sensitive tables
      ALTER TABLE incidents         ENABLE ROW LEVEL SECURITY;
      ALTER TABLE incident_updates  ENABLE ROW LEVEL SECURITY;
      ALTER TABLE incident_responders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE incident_media    ENABLE ROW LEVEL SECURITY;
      ALTER TABLE safe_points       ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
      ALTER TABLE broadcasts        ENABLE ROW LEVEL SECURITY;
      ALTER TABLE area_memberships  ENABLE ROW LEVEL SECURITY;
    `);

    // RLS policies use a session variable set by the application layer:
    //   SET LOCAL app.current_user_id = '<uuid>';
    //   SET LOCAL app.current_area_ids = '<uuid1>,<uuid2>'; (comma-separated)
    await queryRunner.query(`
      -- Incidents: visible only if user is a member of the area
      CREATE POLICY area_isolation ON incidents
        USING (
          area_id = ANY(
            string_to_array(current_setting('app.current_area_ids', TRUE), ',')::UUID[]
          )
        );
    `);

    await queryRunner.query(`
      -- Notifications: users can only see their own
      CREATE POLICY user_isolation ON notifications
        USING (
          user_id = current_setting('app.current_user_id', TRUE)::UUID
        );
    `);
  }

  // ─────────────────────────────────────────────────────────────────────────
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS broadcasts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS incident_media CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS incident_responders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS incident_updates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS incidents CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS safe_points CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS area_invitations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS area_memberships CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS areas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);

    // Drop triggers and functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_audit_log_mutation() CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trigger_compute_centroid() CASCADE`);

    // Drop types
    const types = [
      'audit_action', 'broadcast_priority', 'notification_type', 'media_type',
      'update_type', 'incident_severity', 'incident_status', 'incident_type',
      'safe_point_type', 'join_method', 'area_role', 'area_type', 'global_role',
    ];
    for (const type of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${type} CASCADE`);
    }
  }
}
