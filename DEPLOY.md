# CERP — Production Deployment Guide

Stack: **Next.js** (Vercel) + **NestJS** (Railway) + **PostgreSQL+PostGIS** (Supabase) + **Redis** (Upstash) + **File Storage** (Cloudflare R2)

ค่าใช้จ่ายโดยประมาณ: **ฟรี–$5/เดือน**

---

## ขั้นตอนที่ 1 — GitHub

1. สร้าง repo ใหม่ที่ [github.com/new](https://github.com/new) (private หรือ public ก็ได้)
2. Push โค้ด:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/cerp.git
git push -u origin main
```

---

## ขั้นตอนที่ 2 — Supabase (PostgreSQL + PostGIS) 🆓

1. ไปที่ [supabase.com](https://supabase.com) → **Start your project** → สร้าง account
2. **New project** → ตั้งชื่อ `cerp` → เลือก region ใกล้ที่สุด (Singapore แนะนำ) → ตั้ง password
3. รอ ~2 นาที ให้ project พร้อม
4. ไปที่ **Project Settings → Database → Connection parameters** → จด:
   - Host, Port, Database, User, Password
5. ไปที่ **SQL Editor** → เปิด PostGIS:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
6. Migrations จะรันอัตโนมัติตอน API ขึ้นครั้งแรก (`migrationsRun: true` ใน production)

> **Note:** ใช้ password ที่ตั้งตอนสร้าง project ไม่ใช่ password จาก API keys

---

## ขั้นตอนที่ 3 — Upstash (Redis) 🆓

1. ไปที่ [upstash.com](https://upstash.com) → **Create account** → **Create Database**
2. เลือก **Redis** → ตั้งชื่อ `cerp-redis` → Region: Singapore → **Create**
3. ไปที่ database → **Details** → จด:
   - `UPSTASH_REDIS_REST_HOST` → ใช้เป็น `REDIS_HOST`
   - `UPSTASH_REDIS_REST_PORT` → `6379`
   - Password จาก Redis URL: `redis://:PASSWORD@host:port`

---

## ขั้นตอนที่ 4 — Cloudflare R2 (File Storage) 🆓 10GB

1. ไปที่ [cloudflare.com](https://cloudflare.com) → สมัคร account → **R2 Object Storage**
2. **Create bucket** → ชื่อ `cerp-media`
3. **Manage R2 API Tokens** → **Create API Token** → Permissions: Object Read & Write → **Create Token**
4. จด: Account ID, Access Key ID, Secret Access Key
5. Endpoint จะเป็น: `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com`

---

## ขั้นตอนที่ 5 — Firebase (Push Notifications) 🆓

> ถ้ามี Firebase config จาก dev อยู่แล้ว ข้ามได้เลย แค่เอา key มาใส่

1. ไปที่ [console.firebase.google.com](https://console.firebase.google.com)
2. เลือก project → **Project Settings → Service Accounts → Generate new private key**
3. Download JSON file → จะได้ `project_id`, `private_key`, `client_email`
4. **Project Settings → General → Your apps → Web app** → จด Web Config (NEXT_PUBLIC vars)
5. **Cloud Messaging → Web Push certificates** → Generate key pair → จด VAPID key

---

## ขั้นตอนที่ 6 — Railway (NestJS Backend) ~$5/เดือน

1. ไปที่ [railway.app](https://railway.app) → **Login with GitHub**
2. **New Project → Deploy from GitHub repo** → เลือก repo CERP
3. Railway จะตรวจเจอ `apps/api/railway.json` อัตโนมัติ
4. ไปที่ **Variables** → เพิ่ม environment variables ทั้งหมด:

```
NODE_ENV=production
PORT=4000
APP_URL=https://YOUR-FRONTEND.vercel.app   ← ใส่หลัง deploy Vercel เสร็จ

DB_HOST=db.xxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASS=your-supabase-password
DB_SSL_REJECT_UNAUTHORIZED=false

REDIS_HOST=your.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password
REDIS_TLS=true

JWT_ACCESS_SECRET=   ← สร้างด้วย: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_REFRESH_SECRET=  ← สร้างอีกอัน
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=cerp-media
S3_ACCESS_KEY=your-r2-access-key
S3_SECRET_KEY=your-r2-secret
S3_FORCE_PATH_STYLE=false

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
```

5. **Settings → Networking → Generate Domain** → จด URL เช่น `cerp-api.railway.app`
6. Railway จะ build Docker image และ deploy อัตโนมัติ (~3-5 นาที)
7. ตรวจว่า API ทำงานที่: `https://cerp-api.railway.app/api/v1/health`

---

## ขั้นตอนที่ 7 — Vercel (Next.js Frontend) 🆓

1. ไปที่ [vercel.com](https://vercel.com) → **Login with GitHub**
2. **Add New Project → Import Git Repository** → เลือก repo CERP
3. **Configure Project:**
   - Framework Preset: **Next.js**
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && pnpm --filter web build`
   - Install Command: `pnpm install`
4. **Environment Variables** → เพิ่ม:

```
NEXT_PUBLIC_API_URL=https://cerp-api.railway.app
NEXT_PUBLIC_WS_URL=wss://cerp-api.railway.app

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BH...
```

5. **Deploy** → รอ ~2-3 นาที
6. จด Vercel URL เช่น `cerp.vercel.app`

---

## ขั้นตอนที่ 8 — อัปเดต CORS บน Railway

หลัง Vercel deploy เสร็จ ไปที่ Railway → Variables → อัปเดต:
```
APP_URL=https://cerp.vercel.app
```
Railway จะ redeploy อัตโนมัติ

---

## Domain (ถ้าอยากได้ .com) 💡

ซื้อจาก [Namecheap](https://namecheap.com) (~$10/ปี) หรือ [Cloudflare Registrar](https://cloudflare.com/products/registrar/) (ราคา at-cost)

- **Frontend:** Vercel → Project → Settings → Domains → เพิ่ม domain
- **Backend:** Railway → Settings → Networking → Custom Domain

---

## Checklist ก่อน Go Live

- [ ] `APP_URL` บน Railway ตรงกับ Vercel URL
- [ ] `/api/v1/health` ตอบ 200
- [ ] ลอง register + login ได้
- [ ] ลอง SOS ได้
- [ ] Firebase push notification ทำงาน
- [ ] ไม่มี `localhost` ใน environment variables

---

## ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|---------|
| API ขึ้นแล้ว 503 | ดู Railway logs → มักเป็น DB connection fail |
| CORS error | ตรวจ `APP_URL` ใน Railway ว่าตรงกับ Vercel URL |
| WebSocket ไม่ต่อ | `NEXT_PUBLIC_WS_URL` ต้องเป็น `wss://` ไม่ใช่ `ws://` |
| Migration fail | ตรวจ PostGIS extension ใน Supabase SQL Editor |
| Push notification ไม่มา | ตรวจ `FIREBASE_PRIVATE_KEY` มี `\n` ถูกต้อง |
