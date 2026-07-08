# KaamWala

KaamWala is a local services booking platform using a static Vite frontend, Tailwind CSS, and Supabase Auth/Postgres.

Current service cities:

- Lucknow
- Unnao
- Kanpur
- Basti
- Gorakhpur

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:

   ```bash
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

3. In Supabase, open SQL Editor and run the migration files in `supabase/migrations` in filename order. If you already ran older migrations, also run `005_add_email_auth_support.sql` and `006_add_user_profile_fields.sql`.

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Build for production:

   ```bash
   npm run build
   ```

## Supabase notes

- Enable Email Auth in Supabase Auth.
- Use email/password auth. Keep email confirmation enabled for signup verification.
- Password reset uses Supabase recovery email/link. If your template sends a code, the reset form also supports a recovery OTP.
- The frontend must only use the Supabase anon key.
- Never expose the Supabase service-role key in this app.

## Admin URLs

The admin panel is intentionally separate from the customer app:

- `/admin/login`
- `/admin/dashboard`

Do not add these links to public navigation unless you intentionally want admins to discover them there.

## Vercel deployment

1. Push the repo to GitHub.
2. Import `Azeemaslam-321/Kaamwala` into Vercel.
3. Use the default build command from `vercel.json`: `npm run build`.
4. Set output directory to `dist`.
5. Add these Environment Variables in Vercel:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

6. Deploy.

## Security checklist

- Keep only `VITE_SUPABASE_ANON_KEY` in the frontend.
- Never commit `.env` or Supabase service-role keys.
- RLS policies in `supabase/migrations/001_schema_and_rls.sql` are required before real users are added.
- User-rendered strings are escaped in `src/utils.js`.
- For booking spam protection, add a Supabase Edge Function or Vercel serverless endpoint later. Rate-limit by `auth.uid()`, email, and IP before inserting bookings server-side.
- If a service-role key is ever pasted publicly, rotate it immediately in Supabase Dashboard.
