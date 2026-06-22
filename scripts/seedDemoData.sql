-- Seeds TaskMe demo data for the CleanPro demo tenant.
-- Safe to rerun. This script removes prior demo task records before inserting fresh ones.
-- Prerequisite: the demo auth users already exist in auth.users / public.profiles.
-- Required profile emails:
--   david.wong@cleanpro-demo.com
--   michael.lim@cleanpro-demo.com
--   sarah.tan@cleanpro-demo.com
--   ahmad.bin@cleanpro-demo.com
--   priya.nair@cleanpro-demo.com

DO $$
DECLARE
  demo_org_id uuid;
  manager_id uuid;
  supervisor_id uuid;
  sarah_id uuid;
  ahmad_id uuid;
  priya_id uuid;
  fallback_assigned_to_id text;
  fallback_category_id text;
  tasks_has_assigned_to boolean;
  tasks_has_assigned_to_id boolean;
  tasks_assigned_to_id_is_uuid boolean;
  uses_legacy_task_schema boolean;
  tasks_has_category_id boolean;
  tasks_has_org_id boolean;
  tasks_has_site_id boolean;
  tasks_has_site_location boolean;
  has_task_evidence_table boolean;
  has_task_reviews_table boolean;
  has_escalations_table boolean;
  evidence_has_org_id boolean;
  reviews_has_org_id boolean;
  escalations_has_org_id boolean;
  site_mbs_id uuid;
  site_food_id uuid;
  site_lobby_id uuid;
  site_cbp_id uuid;
  row_data record;
  mapped_status text;
  mapped_priority text;
  demo_task_titles text[] := ARRAY[
    'Clean and sanitize all washrooms - Level 3',
    'Mop marble flooring - Main lobby',
    'Glass panel polishing - Entrance facade',
    'Sanitize common area furniture',
    'Restock consumables - All dispensers',
    'Vacuum carpeted meeting rooms',
    'Wipe down office partitions',
    'Deep clean kitchen exhaust hood',
    'Clear food waste from bin centre',
    'Polish elevator door panels',
    'Pressure wash car park Level B1',
    'Descale water features - Lobby fountain',
    'Emergency spill cleanup - Chemical leak B2',
    'Repair and clean ceiling water damage - Level 2',
    'Floor wax application - Office Level 4'
  ];
BEGIN
  INSERT INTO public.organizations (id, name, slug)
  VALUES ('00000000-0000-0000-0000-000000000001', 'CleanPro Demo', 'cleanpro-demo')
  ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name;

  SELECT id INTO demo_org_id
  FROM public.organizations
  WHERE slug = 'cleanpro-demo'
  LIMIT 1;

  INSERT INTO public.sites (org_id, name, address)
  VALUES
    (demo_org_id, 'Marina Bay Sands - Level 3',       '10 Bayfront Ave, Singapore 018956'),
    (demo_org_id, 'CapitaLand Mall - Food Court',     '252 North Bridge Rd, Singapore 179103'),
    (demo_org_id, 'One Raffles Place - Lobby',        '1 Raffles Place, Singapore 048616'),
    (demo_org_id, 'Changi Business Park - Block A',   '1 Changi Business Park Central 1, Singapore 486036')
  ON CONFLICT (org_id, name) DO UPDATE
    SET address = EXCLUDED.address;

  SELECT id INTO site_mbs_id
  FROM public.sites
  WHERE org_id = demo_org_id AND name = 'Marina Bay Sands - Level 3'
  LIMIT 1;

  SELECT id INTO site_food_id
  FROM public.sites
  WHERE org_id = demo_org_id AND name = 'CapitaLand Mall - Food Court'
  LIMIT 1;

  SELECT id INTO site_lobby_id
  FROM public.sites
  WHERE org_id = demo_org_id AND name = 'One Raffles Place - Lobby'
  LIMIT 1;

  SELECT id INTO site_cbp_id
  FROM public.sites
  WHERE org_id = demo_org_id AND name = 'Changi Business Park - Block A'
  LIMIT 1;

  SELECT id INTO manager_id
  FROM public.profiles
  WHERE email = 'david.wong@cleanpro-demo.com'
  LIMIT 1;

  SELECT id INTO supervisor_id
  FROM public.profiles
  WHERE email = 'michael.lim@cleanpro-demo.com'
  LIMIT 1;

  SELECT id INTO sarah_id
  FROM public.profiles
  WHERE email = 'sarah.tan@cleanpro-demo.com'
  LIMIT 1;

  SELECT id INTO ahmad_id
  FROM public.profiles
  WHERE email = 'ahmad.bin@cleanpro-demo.com'
  LIMIT 1;

  SELECT id INTO priya_id
  FROM public.profiles
  WHERE email = 'priya.nair@cleanpro-demo.com'
  LIMIT 1;

  IF manager_id IS NULL OR supervisor_id IS NULL OR sarah_id IS NULL OR ahmad_id IS NULL OR priya_id IS NULL THEN
    RAISE EXCEPTION 'Missing required demo profiles. Create the demo auth users first, then rerun this script.';
  END IF;

  UPDATE public.profiles
  SET full_name = 'David Wong',
      role = 'manager',
      org_id = demo_org_id,
      reports_to = NULL
  WHERE id = manager_id;

  UPDATE public.profiles
  SET full_name = 'Michael Lim',
      role = 'supervisor',
      org_id = demo_org_id,
      reports_to = manager_id
  WHERE id = supervisor_id;

  UPDATE public.profiles
  SET full_name = 'Sarah Tan',
      role = 'staff',
      org_id = demo_org_id,
      reports_to = supervisor_id
  WHERE id = sarah_id;

  UPDATE public.profiles
  SET full_name = 'Ahmad Bin Yusof',
      role = 'staff',
      org_id = demo_org_id,
      reports_to = supervisor_id
  WHERE id = ahmad_id;

  UPDATE public.profiles
  SET full_name = 'Priya Nair',
      role = 'staff',
      org_id = demo_org_id,
      reports_to = supervisor_id
  WHERE id = priya_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assigned_to'
  ) INTO tasks_has_assigned_to;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assigned_to_id'
  ) INTO tasks_has_assigned_to_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'assigned_to_id'
      AND udt_name = 'uuid'
  ) INTO tasks_assigned_to_id_is_uuid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'category_id'
  ) INTO tasks_has_category_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'org_id'
  ) INTO tasks_has_org_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'site_id'
  ) INTO tasks_has_site_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'site_location'
  ) INTO tasks_has_site_location;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_evidence'
  ) INTO has_task_evidence_table;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_reviews'
  ) INTO has_task_reviews_table;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'escalations'
  ) INTO has_escalations_table;

  uses_legacy_task_schema := tasks_has_assigned_to_id AND NOT tasks_has_assigned_to;

  IF tasks_has_assigned_to_id AND NOT tasks_assigned_to_id_is_uuid THEN
    SELECT assigned_to_id INTO fallback_assigned_to_id
    FROM public.tasks
    WHERE assigned_to_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF uses_legacy_task_schema AND NOT tasks_assigned_to_id_is_uuid AND fallback_assigned_to_id IS NULL THEN
    RAISE EXCEPTION 'Could not find a valid tasks.assigned_to_id reference for the legacy schema.';
  END IF;

  IF tasks_has_category_id THEN
    SELECT category_id INTO fallback_category_id
    FROM public.tasks
    WHERE category_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF has_task_evidence_table THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'task_evidence' AND column_name = 'org_id'
    ) INTO evidence_has_org_id;
  END IF;

  IF has_task_reviews_table THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'task_reviews' AND column_name = 'org_id'
    ) INTO reviews_has_org_id;
  END IF;

  IF has_escalations_table THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'escalations' AND column_name = 'org_id'
    ) INTO escalations_has_org_id;
  END IF;

  IF has_escalations_table THEN
    DELETE FROM public.escalations
    WHERE task_id::text IN (
      SELECT id::text
      FROM public.tasks
      WHERE title = ANY (demo_task_titles)
    );
  END IF;

  IF has_task_reviews_table THEN
    DELETE FROM public.task_reviews
    WHERE task_id::text IN (
      SELECT id::text
      FROM public.tasks
      WHERE title = ANY (demo_task_titles)
    );
  END IF;

  IF has_task_evidence_table THEN
    DELETE FROM public.task_evidence
    WHERE task_id::text IN (
      SELECT id::text
      FROM public.tasks
      WHERE title = ANY (demo_task_titles)
    );
  END IF;

  DELETE FROM public.tasks
  WHERE title = ANY (demo_task_titles);

  CREATE TEMP TABLE temp_seed_tasks (
    seq integer PRIMARY KEY,
    task_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    assigned_profile_id uuid NOT NULL,
    created_profile_id uuid NOT NULL,
    site_location text,
    site_id uuid,
    raw_priority text NOT NULL,
    raw_status text NOT NULL,
    due_date timestamptz NOT NULL,
    completed_at timestamptz
  ) ON COMMIT DROP;

  INSERT INTO temp_seed_tasks (
    seq, task_id, title, description, assigned_profile_id, created_profile_id, site_location, site_id, raw_priority, raw_status, due_date, completed_at
  ) VALUES
    (1, '4f6702ec-e7e4-4fd8-b0d4-737f4c70c301'::uuid, 'Clean and sanitize all washrooms - Level 3', 'Deep clean all 6 washrooms on Level 3 including toilet bowls, sinks, mirrors, and floor mopping. Restock tissue and soap.', sarah_id, supervisor_id, 'Marina Bay Sands - Level 3', site_mbs_id, 'medium', 'completed', now() - interval '1 day', now() - interval '1 day'),
    (2, '3f5fd4c0-7e77-4baf-b663-5a534ebb277d'::uuid, 'Mop marble flooring - Main lobby', 'Use neutral pH floor cleaner on all marble surfaces. Buff to shine. Place wet floor signs during cleaning.', ahmad_id, supervisor_id, 'One Raffles Place - Lobby', site_lobby_id, 'high', 'completed', now() - interval '2 day', now() - interval '2 day'),
    (3, '1e9c735b-6344-4f67-aaf1-160492750c71'::uuid, 'Glass panel polishing - Entrance facade', 'Clean all glass panels at the main entrance using streak-free glass cleaner. Both interior and exterior surfaces.', priya_id, supervisor_id, 'One Raffles Place - Lobby', site_lobby_id, 'low', 'completed', now() - interval '3 day', now() - interval '3 day'),
    (4, '9577a315-d9ff-46d4-b3eb-73321c4ee853'::uuid, 'Sanitize common area furniture', 'Wipe down all tables, chairs, and benches in common areas with hospital-grade disinfectant.', sarah_id, supervisor_id, 'CapitaLand Mall - Food Court', site_food_id, 'medium', 'completed', now() - interval '5 hour', now() - interval '4 hour'),
    (5, '9f57d546-f0dd-4b12-b367-0d7a99db5756'::uuid, 'Restock consumables - All dispensers', 'Check and refill all soap dispensers, tissue holders, and hand sanitizer stations across all floors.', priya_id, supervisor_id, 'Marina Bay Sands - Level 3', site_mbs_id, 'medium', 'pending', now() + interval '4 hour', null),
    (6, 'b7df27c5-1aea-4edc-a5f5-7a65a5adf53d'::uuid, 'Vacuum carpeted meeting rooms', 'Vacuum all 8 meeting rooms on Level 5. Move chairs and vacuum under tables. Empty vacuum bag after completion.', ahmad_id, supervisor_id, 'Changi Business Park - Block A', site_cbp_id, 'low', 'pending', now() + interval '6 hour', null),
    (7, '5163b9d9-4e7a-4c5b-9625-8ad306420e9f'::uuid, 'Wipe down office partitions', 'Clean all glass and acrylic partitions in the open office area using anti-static wipes.', sarah_id, supervisor_id, 'Changi Business Park - Block A', site_cbp_id, 'low', 'pending', now() + interval '8 hour', null),
    (8, '5b5b25cf-4fa5-479b-a9f5-617b53cf4483'::uuid, 'Deep clean kitchen exhaust hood', 'Degrease and clean all kitchen exhaust hood filters and surrounding areas. Use industrial degreaser.', ahmad_id, supervisor_id, 'CapitaLand Mall - Food Court', site_food_id, 'high', 'in_progress', now() - interval '2 hour', null),
    (9, '98ed7e56-6ef1-47ff-b361-0defc446d50f'::uuid, 'Clear food waste from bin centre', 'Empty all food waste bins, clean bin interiors with bleach solution, replace bin liners. Wash surrounding floor area.', sarah_id, supervisor_id, 'CapitaLand Mall - Food Court', site_food_id, 'high', 'pending', now() - interval '3 hour', null),
    (10, 'a7b5914d-8e37-4838-b609-0c54172896c2'::uuid, 'Polish elevator door panels', 'Polish all stainless steel elevator door panels on floors 1-5 using metal polish. Remove fingerprints and smudges.', priya_id, supervisor_id, 'One Raffles Place - Lobby', site_lobby_id, 'medium', 'pending', now() - interval '4 hour', null),
    (11, '97cb31ee-e5c4-47f9-92f0-5df14d44ecce'::uuid, 'Pressure wash car park Level B1', 'Pressure wash entire B1 car park floor. Focus on oil stains near parking bays 15-30. Allow 2 hours drying time.', ahmad_id, supervisor_id, 'Marina Bay Sands - Level 3', site_mbs_id, 'medium', 'completed', now() - interval '1 hour', now() - interval '1 hour'),
    (12, '32a6935e-c0c2-4535-8a33-4c240af4b3e8'::uuid, 'Descale water features - Lobby fountain', 'Descale and clean the lobby water fountain. Drain, scrub with descaling agent, refill with treated water.', priya_id, supervisor_id, 'One Raffles Place - Lobby', site_lobby_id, 'low', 'completed', now() - interval '2 hour', now() - interval '1 hour'),
    (13, '6d7b6896-3130-47dd-8d54-8455a5ab9833'::uuid, 'Emergency spill cleanup - Chemical leak B2', 'URGENT: Chemical spill detected in basement B2 storage area. Use spill kit. Follow SDS protocol for cleaning agent residue.', sarah_id, supervisor_id, 'Changi Business Park - Block A', site_cbp_id, 'critical', 'in_progress', now() - interval '6 hour', null),
    (14, 'bc204a72-b83d-4355-a9d2-241b6b0255c8'::uuid, 'Repair and clean ceiling water damage - Level 2', 'Water stain on ceiling tiles Level 2 corridor. Remove damaged tiles, clean mold if present, coordinate tile replacement.', ahmad_id, supervisor_id, 'Marina Bay Sands - Level 3', site_mbs_id, 'critical', 'pending', now() - interval '8 hour', null),
    (15, 'b148fd1e-e0db-4a35-9ed3-944362ce7a6f'::uuid, 'Floor wax application - Office Level 4', 'Apply 3 coats of floor wax to vinyl flooring on Level 4. Allow 45 minutes drying between coats.', priya_id, supervisor_id, 'Changi Business Park - Block A', site_cbp_id, 'medium', 'rejected', now() - interval '1 day', null);

  FOR row_data IN
    SELECT * FROM temp_seed_tasks ORDER BY seq
  LOOP
    mapped_status := CASE
      WHEN uses_legacy_task_schema AND row_data.raw_status = 'completed' THEN 'approved'
      WHEN uses_legacy_task_schema THEN 'todo'
      ELSE row_data.raw_status
    END;

    mapped_priority := CASE
      WHEN uses_legacy_task_schema AND row_data.raw_priority = 'critical' THEN 'high'
      ELSE row_data.raw_priority
    END;

    IF uses_legacy_task_schema THEN
      IF tasks_assigned_to_id_is_uuid THEN
        INSERT INTO public.tasks (
          id,
          title,
          description,
          status,
          priority,
          due_date,
          category_id,
          assigned_to_id
        ) VALUES (
          row_data.task_id,
          row_data.title,
          row_data.description,
          mapped_status,
          mapped_priority,
          row_data.due_date,
          fallback_category_id,
          row_data.assigned_profile_id
        );
      ELSE
        INSERT INTO public.tasks (
          id,
          title,
          description,
          status,
          priority,
          due_date,
          category_id,
          assigned_to_id
        ) VALUES (
          row_data.task_id,
          row_data.title,
          row_data.description,
          mapped_status,
          mapped_priority,
          row_data.due_date,
          fallback_category_id,
          fallback_assigned_to_id
        );
      END IF;

      IF tasks_has_org_id OR tasks_has_site_id OR tasks_has_site_location THEN
        EXECUTE format(
          'UPDATE public.tasks SET %s WHERE id = $1',
          array_to_string(
            array_remove(
              ARRAY[
                CASE WHEN tasks_has_org_id THEN format('org_id = %L::uuid', demo_org_id::text) END,
                CASE WHEN tasks_has_site_id AND row_data.site_id IS NOT NULL THEN format('site_id = %L::uuid', row_data.site_id::text) END,
                CASE WHEN tasks_has_site_id AND row_data.site_id IS NULL THEN 'site_id = NULL' END,
                CASE WHEN tasks_has_site_location AND row_data.site_location IS NOT NULL THEN format('site_location = %L', row_data.site_location) END,
                CASE WHEN tasks_has_site_location AND row_data.site_location IS NULL THEN 'site_location = NULL' END
              ],
              NULL
            ),
            ', '
          )
        ) USING row_data.task_id;
      END IF;
    ELSE
      INSERT INTO public.tasks (
        id,
        title,
        description,
        assigned_to,
        created_by,
        site_location,
        priority,
        status,
        due_date,
        completed_at,
        org_id,
        site_id
      ) VALUES (
        row_data.task_id,
        row_data.title,
        row_data.description,
        row_data.assigned_profile_id,
        row_data.created_profile_id,
        row_data.site_location,
        mapped_priority,
        mapped_status,
        row_data.due_date,
        row_data.completed_at,
        demo_org_id,
        row_data.site_id
      );
    END IF;
  END LOOP;

  IF has_task_evidence_table THEN
    IF evidence_has_org_id THEN
      INSERT INTO public.task_evidence (task_id, submitted_by, photo_url, notes, org_id)
      VALUES
        ('97cb31ee-e5c4-47f9-92f0-5df14d44ecce'::uuid, ahmad_id, 'https://placehold.co/800x600/e2e8f0/475569?text=Evidence+Photo', 'Car park B1 pressure washed. Oil stains removed from bays 15-30. Floor drying in progress.', demo_org_id),
        ('32a6935e-c0c2-4535-8a33-4c240af4b3e8'::uuid, priya_id, 'https://placehold.co/800x600/e2e8f0/475569?text=Evidence+Photo', 'Fountain descaled and refilled. Water pump tested and running smoothly. Before/after photos attached.', demo_org_id),
        ('4f6702ec-e7e4-4fd8-b0d4-737f4c70c301'::uuid, sarah_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'All 6 washrooms cleaned and sanitized. Supplies restocked.', demo_org_id),
        ('3f5fd4c0-7e77-4baf-b663-5a534ebb277d'::uuid, ahmad_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'Marble flooring mopped and buffed to shine. Wet floor signs placed.', demo_org_id),
        ('1e9c735b-6344-4f67-aaf1-160492750c71'::uuid, priya_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'All entrance glass panels polished. Streak-free finish achieved.', demo_org_id),
        ('9577a315-d9ff-46d4-b3eb-73321c4ee853'::uuid, sarah_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'All common area furniture sanitized with hospital-grade disinfectant.', demo_org_id);
    ELSE
      INSERT INTO public.task_evidence (task_id, submitted_by, photo_url, notes)
      VALUES
        ('97cb31ee-e5c4-47f9-92f0-5df14d44ecce'::uuid, ahmad_id, 'https://placehold.co/800x600/e2e8f0/475569?text=Evidence+Photo', 'Car park B1 pressure washed. Oil stains removed from bays 15-30. Floor drying in progress.'),
        ('32a6935e-c0c2-4535-8a33-4c240af4b3e8'::uuid, priya_id, 'https://placehold.co/800x600/e2e8f0/475569?text=Evidence+Photo', 'Fountain descaled and refilled. Water pump tested and running smoothly. Before/after photos attached.'),
        ('4f6702ec-e7e4-4fd8-b0d4-737f4c70c301'::uuid, sarah_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'All 6 washrooms cleaned and sanitized. Supplies restocked.'),
        ('3f5fd4c0-7e77-4baf-b663-5a534ebb277d'::uuid, ahmad_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'Marble flooring mopped and buffed to shine. Wet floor signs placed.'),
        ('1e9c735b-6344-4f67-aaf1-160492750c71'::uuid, priya_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'All entrance glass panels polished. Streak-free finish achieved.'),
        ('9577a315-d9ff-46d4-b3eb-73321c4ee853'::uuid, sarah_id, 'https://placehold.co/800x600/d1fae5/166534?text=Completed', 'All common area furniture sanitized with hospital-grade disinfectant.');
    END IF;
  END IF;

  IF has_task_reviews_table THEN
    IF reviews_has_org_id THEN
      INSERT INTO public.task_reviews (task_id, reviewed_by, action, comment, org_id)
      VALUES
        ('4f6702ec-e7e4-4fd8-b0d4-737f4c70c301'::uuid, supervisor_id, 'approved', 'Good work. Standards met.', demo_org_id),
        ('3f5fd4c0-7e77-4baf-b663-5a534ebb277d'::uuid, supervisor_id, 'approved', 'Good work. Standards met.', demo_org_id),
        ('1e9c735b-6344-4f67-aaf1-160492750c71'::uuid, supervisor_id, 'approved', 'Good work. Standards met.', demo_org_id),
        ('9577a315-d9ff-46d4-b3eb-73321c4ee853'::uuid, supervisor_id, 'approved', 'Good work. Standards met.', demo_org_id),
        ('b148fd1e-e0db-4a35-9ed3-944362ce7a6f'::uuid, supervisor_id, 'rejected', 'Floor wax application incomplete - only 1 coat applied instead of 3. Please redo with full 3 coats.', demo_org_id);
    ELSE
      INSERT INTO public.task_reviews (task_id, reviewed_by, action, comment)
      VALUES
        ('4f6702ec-e7e4-4fd8-b0d4-737f4c70c301'::uuid, supervisor_id, 'approved', 'Good work. Standards met.'),
        ('3f5fd4c0-7e77-4baf-b663-5a534ebb277d'::uuid, supervisor_id, 'approved', 'Good work. Standards met.'),
        ('1e9c735b-6344-4f67-aaf1-160492750c71'::uuid, supervisor_id, 'approved', 'Good work. Standards met.'),
        ('9577a315-d9ff-46d4-b3eb-73321c4ee853'::uuid, supervisor_id, 'approved', 'Good work. Standards met.'),
        ('b148fd1e-e0db-4a35-9ed3-944362ce7a6f'::uuid, supervisor_id, 'rejected', 'Floor wax application incomplete - only 1 coat applied instead of 3. Please redo with full 3 coats.');
    END IF;
  END IF;

  IF has_escalations_table THEN
    IF escalations_has_org_id THEN
      INSERT INTO public.escalations (task_id, escalated_from, escalated_to, reason, is_resolved, org_id)
      VALUES
        ('6d7b6896-3130-47dd-8d54-8455a5ab9833'::uuid, supervisor_id, manager_id, 'CRITICAL: Chemical spill in B2 has not been fully resolved after 6 hours. Staff reports insufficient spill kit supplies. Needs immediate management intervention.', false, demo_org_id),
        ('bc204a72-b83d-4355-a9d2-241b6b0255c8'::uuid, supervisor_id, manager_id, 'CRITICAL: Ceiling water damage on Level 2 worsening. Possible mold risk. Awaiting contractor coordination - requires manager approval for emergency procurement.', false, demo_org_id);
    ELSE
      INSERT INTO public.escalations (task_id, escalated_from, escalated_to, reason, is_resolved)
      VALUES
        ('6d7b6896-3130-47dd-8d54-8455a5ab9833'::uuid, supervisor_id, manager_id, 'CRITICAL: Chemical spill in B2 has not been fully resolved after 6 hours. Staff reports insufficient spill kit supplies. Needs immediate management intervention.', false),
        ('bc204a72-b83d-4355-a9d2-241b6b0255c8'::uuid, supervisor_id, manager_id, 'CRITICAL: Ceiling water damage on Level 2 worsening. Possible mold risk. Awaiting contractor coordination - requires manager approval for emergency procurement.', false);
    END IF;
  END IF;

  RAISE NOTICE 'Demo data seeded for cleanpro-demo';
END $$;
