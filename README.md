[README.md](https://github.com/user-attachments/files/26322561/README.md)
# 🎲 Chance — Curated Stumble Feed

**Rediscover the internet. One roll at a time.**

A StumbleUpon-style discovery app. Hit Chance, get a random curated URL.
React with 🥱 or 🤯. Save to your vault. Report dead links.

## Tech Stack
- **Next.js 14** (React, App Router)
- **Supabase** (Postgres, Auth-ready, RLS)
- **No UI library** — custom dark theme, zero dependencies

---

## Quick Setup (5 minutes)

### 1. Database Setup
1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `supabase-schema.sql`
4. Click **Run** ✅

### 2. Environment Variables
Edit `.env.local` and fill in your keys:
```
NEXT_PUBLIC_SUPABASE_URL=https://mvsbxyopyzfgevezqlht.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the feed.
Open [http://localhost:3000/admin](http://localhost:3000/admin) — add URLs.

---

## Pages

| Route | What it does |
|-------|-------------|
| `/` | Main feed — single card, hit Chance to roll |
| `/admin` | Add URLs (single or bulk), manage pool |

---

## Features

### Feed (main page)
- **Single card experience** — one URL at a time
- **🥱 Yawn** — negative reaction (meh)
- **🎲 Chance** — roll to the next URL
- **🤯 Mindblown** — positive reaction (amazing!)
- **Save** — bookmark to your vault
- **Share** — copy link or native share
- **Report** — flag inappropriate content
- **💀 Dead** — report broken/dead links
- Reaction counts update in real-time
- Session-based (no auth required)

### Admin Panel (`/admin`)
- Add single URLs with title, description, category
- Bulk import (one URL per line, or csv: url,title,description)
- Search and filter existing URLs
- Mark URLs as dead / revive
- Delete URLs
- Stats dashboard (total, active, dead, categories)

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `urls` | The content pool (URL, title, desc, category, dead flag) |
| `url_events` | Reactions (mindblown, yawn, click, skip) |
| `vault_saves` | User bookmarks |
| `url_reports` | Content flags |
| `dead_reports` | Dead link reports |
| `blocked_domains` | Admin domain blocklist |
| `url_scores` | Cached feed ranking scores |
| `user_rep` | User reputation (Phase 2 foundation) |

---

## Loading URLs

### Via Admin Panel
Go to `/admin` → **Bulk Import** tab → paste URLs (one per line).

### Via SQL
```sql
INSERT INTO urls (url, domain, title, category) VALUES
  ('https://example.com', 'example.com', 'Cool Site', 'tools'),
  ('https://another.com', 'another.com', 'Another One', 'fun');
```

---

## Architecture Notes

- **No auth yet** — uses anonymous session IDs (crypto.randomUUID)
- **One reaction per session per URL** — enforced by unique index
- **RLS enabled** on all tables with permissive policies for now
- **Scoring formula**: `S = (mindblown × 2) - (yawn × 1)` with time decay
- **Feed sampling**: 60% quality / 30% exploration / 10% random

---

## Phase 2 (Ready)
- User accounts (Supabase Auth)
- Reputation system (user_rep table exists)
- Personalized feed (domain/topic affinity)
- Vault page to browse saved URLs

## Phase 3 (Designed)
- Token rewards for accurate curation
- Discovery / Curation / Growth reward pools
- Anti-gaming: delayed rewards, circular boost detection
