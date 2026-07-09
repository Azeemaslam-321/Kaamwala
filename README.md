# KaamNest

KaamNest is a Lucknow-first home services platform for booking trusted local professionals such as electricians, plumbers, carpenters, AC/RO technicians, cleaners, painters, CCTV installers, pest-control teams, and appliance repair partners.

Tagline: **Trusted Home Services in Lucknow**

## What is included

- Vite + Tailwind production frontend
- Supabase Auth with email/password signup, email verification, login, logout, and password reset
- Role-based flows for customer, worker/professional, and admin
- Customer dashboard, worker dashboard, booking tracking, service pages, area SEO pages, blog/contact/legal pages
- Separate admin URLs under `/admin`
- Supabase migrations for schema, RLS, admin access, services, service areas, bookings, payments placeholder, contact queries, worker documents, settings, and audit logs
- Lucknow services and area seed data
- Vercel-ready routing via `vercel.json`

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`:

   ```bash
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

   Use only the Supabase anon/publishable key in frontend env. Never expose the service-role key.

3. Run Supabase SQL migrations in filename order from `supabase/migrations`.

   Important latest files:

   - `008_kaamnest_pro_schema.sql`
   - `009_kaamnest_seed_lucknow.sql`
   - `010_security_hardening_rls_guards.sql`
   - `007_make_azeem_admin.sql` after your admin Auth user exists

4. Start dev server:

   ```bash
   npm run dev
   ```

5. Open:

   - Customer app: `http://127.0.0.1:5173/`
   - Admin login: `http://127.0.0.1:5173/admin/login`

6. Production build:

   ```bash
   npm run build
   ```

## Supabase Auth

- Enable Email provider in Supabase Auth.
- Keep email confirmation enabled for signup verification.
- Signup creates profile data in `public.users`.
- Worker signup creates a pending profile in `public.workers`.
- Admin signup is not public. Create/admin-grant admins from Supabase Auth + SQL only.

## Admin setup

1. Create or confirm the admin user in Supabase Authentication.
2. Open `supabase/migrations/007_make_azeem_admin.sql`, replace `CHANGE_ADMIN_EMAIL@example.com` with your real admin email, then run it in Supabase SQL Editor.
3. Login at `/admin/login`.

If login succeeds but admin access fails, the Auth user exists but the `public.users.role='admin'` or `public.admins` row is missing. Run the admin SQL again.

## Vercel deployment

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

6. Deploy.

`vercel.json` rewrites `/admin/login`, `/admin/dashboard`, and frontend SEO routes to the right HTML files.

## Security notes

- Frontend uses only Supabase anon key.
- Service-role keys must never be committed or pasted into frontend code.
- RLS policies are required before production users.
- Run `010_security_hardening_rls_guards.sql` before production. It prevents normal users from changing protected fields such as admin role, worker verification status, booking amounts, payment status, and assignment fields.
- User-rendered strings are escaped through `src/utils.js`.
- Add production rate limiting through Supabase Edge Functions or Vercel serverless functions before high traffic launch.
- Razorpay is intentionally only a placeholder. Add real online payment through secure backend/serverless endpoints later.

## SEO routes

Examples:

- `/services/electrician-lucknow`
- `/services/plumber-lucknow`
- `/services/ac-repair-lucknow`
- `/areas/gomti-nagar`
- `/areas/aliganj`
- `/services/electrician/gomti-nagar`

The app updates title, meta description, canonical URL, LocalBusiness schema, Service schema, and FAQ schema based on route.
