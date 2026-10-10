# VolleyPro — Render Deployment & Persistent Storage Guide

This document provides complete instructions for deploying the **VolleyPro** Volleyball Tournament Management and Live Scoring system on [Render](https://render.com) using **persistent SQLite storage**.

---

## 1. Storage Architecture & Persistent Disk

VolleyPro uses SQLite configured with:
- **Write-Ahead Logging (`WAL`)** for high concurrency and immediate write durability.
- **SQLite Foreign Key Constraints (`PRAGMA foreign_keys=ON`)** enforced on every connection.
- **Busy timeout (`PRAGMA busy_timeout=10000`)** ensuring no locked transactions fail under load.
- **Safe Database Initialization (`init_db`)**: Missing tables are automatically created on startup using SQLAlchemy `create_all` **without deleting, resetting, or overwriting existing data**.

### Render Persistent Disk Path
- **Disk Mount Path**: `/var/data`
- **SQLite Database Path**: `/var/data/volleyball.db`
- **Environment Variable**: `SQLITE_DB_PATH=/var/data/volleyball.db`

---

## 2. Plan Limitations on Render

> ⚠️ **Important Plan Note:**
> Persistent Disks on Render require an instance type of **Starter tier ($7/mo)** or higher. 
> Render's **Free Tier** uses ephemeral container filesystems that are wiped on container spin-down or rebuilds, and does not support attaching persistent disks. 
> For 100% data persistence across redeployments and restarts in production, use the **Starter** instance type with an attached persistent disk.

---

## 3. Render Dashboard Setup Steps

### Step 1: Create Web Service
1. Connect your GitHub / GitLab repository to Render.
2. Select **New Web Service**.
3. Choose **Python 3** as the Environment.

### Step 2: Configure Build & Start Commands
- **Build Command**:
  ```bash
  ./render_build.sh
  ```
  *(Or: `pip install -r requirements.txt && cd frontend && npm install && npm run build && cd ..`)*
- **Start Command**:
  ```bash
  uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1
  ```
  *(Note: Single worker is recommended for in-memory WebSocket manager broadcasting)*

### Step 3: Attach Persistent Disk
1. In your Web Service settings menu, navigate to **Disks**.
2. Click **Add Disk**.
3. Configure the disk:
   - **Name**: `volleyball-data`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (or larger if needed)
4. Click **Save Changes**.

### Step 4: Configure Environment Variables
In the **Environment** tab, add the following variables:

| Key | Example Value | Description |
|---|---|---|
| `SQLITE_DB_PATH` | `/var/data/volleyball.db` | Absolute path to persistent SQLite database |
| `SCORER_PIN` | `1234` (or your secret PIN) | PIN required by officials to score matches |
| `ADMIN_SECRET` | `volleypro_admin_secret_key` | Master administrative secret key |
| `ENV` | `production` | Production environment flag |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

---

## 4. Safe Database Migration & Backups

### Exporting Backups:
You can export full JSON backups of tournaments, teams, rosters, matches, and scoring logs at any time from:
- The UI: **Storage & Health** tab -> **Export JSON Backup**
- The API: `GET /api/system/backup` with the `X-Scorer-PIN` header.

### Migrating Existing Local SQLite to Render Disk:
If you have an existing local database `volleyball.db` you want to transfer to Render:
1. Export the database JSON snapshot via `/api/system/backup`.
2. Or use the Render Shell in the dashboard:
   ```bash
   # Verify disk mount
   ls -la /var/data
   ```
3. Copy your local SQLite file directly to `/var/data/volleyball.db`.

---

## 5. Verification Checklist

1. [x] Healthcheck endpoint responds at `/api/health` and `/api/system/health`.
2. [x] UI loads at root `/` with SPA direct routing to `/tournaments`, `/teams`, `/matches`, `/scorer/:id`, `/live/:id`.
3. [x] WebSocket connects at `/ws/volleyball/matches/:id` for zero-refresh real-time updates.
4. [x] Scoring operations are protected by `X-Scorer-PIN` / `Authorization` header.
5. [x] Spectator live scoreboard is read-only and responsive on TV, 1080p, 4K, desktop, and mobile.
