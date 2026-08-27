# UtilityHub — Internal Team App

Internal team work management & automation platform for utilityshub.com.

## Stack
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Database/Auth:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** Vercel
- **Domain:** app.utilityshub.com

## Quick Start

### 1. Set up Supabase
1. Go to [supabase.com](https://supabase.com), create a free project
2. Get your Project URL, anon key, and service role key from Settings → API
3. Copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### 2. Run the schema
- In Supabase dashboard → SQL Editor → paste contents of `supabase/schema.sql` → Run
- This creates all tables, RLS policies, triggers, and seeds 4 default projects

### 3. Create first admin user
- In Supabase dashboard → Authentication → Users → Add user
- Set email + password, then go to SQL Editor:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
  ```

### 4. Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000 — you'll be redirected to login.

### 5. Deploy to Vercel
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com), import the repo
3. Add environment variables (same as .env.local)
4. Deploy
5. In Vercel → Settings → Domains → add `app.utilityshub.com`
6. At GoDaddy, add CNAME: `app` → `cname.vercel-dns.com`

## Features (Phase 1)
- ✅ Authentication (Supabase Auth)
- ✅ Role-based access control (Admin, Manager, Researcher, QA, Viewer)
- ✅ RLS at database level
- ✅ Projects (eBay, Amazon, GunBroker, Night Galaxy pre-seeded)
- ✅ Dashboard with stats
- � Employees management (view, add, toggle active, change role)
- ✅ Audit log
- ✅ Task listing + detail view
- ✅ Product listing
- ✅ QA queue
- ✅ Rulebook listing
- ✅ Approved sources listing
- ✅ Reports
- ✅ Settings

## Upcoming Phases
- Phase 2: Products CRUD + Tasks workflow + Excel import
- Phase 3: Rulebook versioning + approval workflow
- Phase 4: Approved sources management
- Phase 5: QA approve/reject workflow
- Phase 6: Excel/CSV import/export
- Phase 7: AI assistance
- Phase 8: Platform-specific modules

## Security
- HTTPS enforced (Vercel)
- RLS on all tables
- Service role key never exposed to client
- Audit logging on all important actions
- `robots: noindex` — not visible to search engines