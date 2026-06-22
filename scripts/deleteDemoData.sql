-- Truncates operational demo/reset tables while leaving profiles, sites,
-- organizations, and auth users intact.
-- Safe to rerun.
-- Prerequisite: run as a sufficiently privileged database role.

DO $$
DECLARE
  target_table text;
  truncate_targets text[] := ARRAY[]::text[];
  qualified_targets text;
BEGIN
  FOR target_table IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'push_subscriptions',
        'task_evidence',
        'task_reviews',
        'escalations',
        'tasks'
      )
    ORDER BY CASE table_name
      WHEN 'push_subscriptions' THEN 1
      WHEN 'task_evidence' THEN 2
      WHEN 'task_reviews' THEN 3
      WHEN 'escalations' THEN 4
      WHEN 'tasks' THEN 5
      ELSE 99
    END
  LOOP
    truncate_targets := array_append(
      truncate_targets,
      format('public.%I', target_table)
    );
  END LOOP;

  IF array_length(truncate_targets, 1) IS NULL THEN
    RAISE NOTICE 'No reset target tables found.';
    RETURN;
  END IF;

  qualified_targets := array_to_string(truncate_targets, ', ');

  EXECUTE 'TRUNCATE TABLE ' || qualified_targets || ' RESTART IDENTITY CASCADE';

  RAISE NOTICE 'Reset tables truncated: %', qualified_targets;
END $$;
