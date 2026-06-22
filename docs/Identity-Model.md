# Identity Model (Canonical)

This project does not use a `staff_members` database table.

## Source of truth

- `auth.users`: authentication records managed by Supabase Auth.
- `public.profiles`: application user metadata keyed by the same user id.

`public.profiles.id` is the same UUID as `auth.users.id`.

## Why `profiles` exists

Application features require fields that are not part of `auth.users` and should be queryable with app-level policies:

- `role` (`staff`, `supervisor`, `manager`)
- `org_id`
- `reports_to`
- `full_name`, `avatar_url`, and app-facing email metadata

## Relationship and query pattern

- Auth/session checks use `auth.users` via Supabase session.
- Authorization, role, org scoping, and reporting hierarchy use `public.profiles`.
- Task assignment and creator references are app user ids (same UUID identity across auth and profiles).

## Important constraints

- Keep `profiles` synchronized with `auth.users` lifecycle.
- Do not add or depend on a separate `staff_members` table.
- Use product language "staff member" in UI text only; map it to `profiles.role = 'staff'` in data queries.

## Implementation note

Some live environments may still have legacy task columns (for example `assigned_to_id`). API writes should stay schema-compatible while preserving this identity model.
