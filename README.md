# AdminHub - Complete Final + Auth + Supabase

Deploy-ready. All fixed files.

## Features
- Dark/light toggle, rounded-full buttons, gradient violet→fuchsia→indigo
- Users CRUD + profiles
- Direct Messages saving to Supabase Postgres via Prisma
- Supabase Auth: login/signup, middleware protected routes, logout
- Current user = John Fortuin (u5) ADMIN
- Realtime messages

## Setup Local
1. npm install
2. cp .env.example .env - fill Supabase values
3. Run SUPABASE_SETUP.sql in Supabase SQL Editor
4. In Supabase Auth > Users > Add User: john@company.com / password123 (auto-confirm)
5. npx prisma generate && npx prisma db push
6. npm run dev -> http://localhost:3000/auth/login

## Deploy to Vercel
- Push to GitHub: git add . && git commit -m "final" && git push origin main
- Vercel auto builds with `prisma generate && next build`
- Add env vars in Vercel Settings > Environment Variables:
  DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Redeploy

## Files Fixed
- lib/prisma.ts: SSL + pooling, no 【 characters
- lib/supabase.ts: realtime
- lib/auth.ts: getCurrentUser
- middleware.ts: protects routes
- app/auth/login/page.tsx: login/signup UI
- app/api/messages/route.ts: saves to DB
- app/api/users/route.ts: CRUD
- postcss.config.mjs: @tailwindcss/postcss (not turbopack)
- package.json: build = prisma generate && next build
- prisma/schema.prisma: Role + UserStatus enums
