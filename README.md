# TaskMe

TaskMe is a multi-tenant task operations app for cleaning teams. It supports role-based flows for staff, supervisors, and managers with Supabase-backed data and policies.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`.

3. Start the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Identity model

This project does not use a `staff_members` table.

- `auth.users` is the authentication source.
- `public.profiles` is the application identity source.
- `public.profiles.id` maps 1:1 to `auth.users.id`.

Use product wording like "staff member" in UI only. In data access, "staff member" means a `profiles` row with `role = 'staff'`.

See `docs/Identity-Model.md` for full details.

## Scripts

- `npm run dev`: run Next.js locally.
- `npm run build`: production build.
- `npm run lint`: lint checks.

## Notes

- Some live databases may still expose legacy task columns. API writes include compatibility fallbacks where needed.
