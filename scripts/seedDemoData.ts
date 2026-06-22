import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// ── Config ──
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Demo org ──
const DEMO_ORG_SLUG = "cleanpro-demo";
const DEMO_ORG = {
  name: "CleanPro Demo",
  slug: DEMO_ORG_SLUG,
};

// ── Demo users ──
const DEMO_PASSWORD = "Demo@1234";

const users = [
  {
    email: "david.wong@cleanpro-demo.com",
    full_name: "David Wong",
    role: "manager" as const,
  },
  {
    email: "michael.lim@cleanpro-demo.com",
    full_name: "Michael Lim",
    role: "supervisor" as const,
  },
  {
    email: "sarah.tan@cleanpro-demo.com",
    full_name: "Sarah Tan",
    role: "staff" as const,
  },
  {
    email: "ahmad.bin@cleanpro-demo.com",
    full_name: "Ahmad Bin Yusof",
    role: "staff" as const,
  },
  {
    email: "priya.nair@cleanpro-demo.com",
    full_name: "Priya Nair",
    role: "staff" as const,
  },
];

const SITES = [
  "Marina Bay Sands - Level 3",
  "CapitaLand Mall - Food Court",
  "One Raffles Place - Lobby",
  "Changi Business Park - Block A",
];

// ── Helpers ──
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

async function tableExists(table: string): Promise<boolean> {
  const { error } = await supabase.from(table).select("id").limit(1);
  if (!error) return true;
  return !error.message.includes("Could not find the table");
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  if (
    error.message.includes(`Could not find the '${column}' column`) ||
    error.message.includes(`column ${table}.${column} does not exist`)
  ) {
    return false;
  }
  return true;
}

// ── Main ──
async function seed() {
  console.log("🌱 Seeding TaskMe demo data...\n");

  // 0. Create organization and get its ID
  console.log("  Creating organization...");
  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .upsert(DEMO_ORG, { onConflict: "slug" })
    .select("id")
    .single();

  if (orgError || !orgData) {
    console.error(`    ✗ Organization: ${orgError?.message ?? "No data returned"}`);
    process.exit(1);
  }

  const DEMO_ORG_ID = orgData.id;
  console.log(`    ✓ Organization: ${DEMO_ORG.name} (${DEMO_ORG_ID})`);

  // 0b. Create sites
  console.log("\n  Creating sites...");
  const siteIds: Record<string, string> = {};
  for (const siteName of SITES) {
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .upsert({ org_id: DEMO_ORG_ID, name: siteName }, { onConflict: "org_id,name" })
      .select("id")
      .single();

    if (siteError) {
      console.error(`    ✗ Site "${siteName}": ${siteError.message}`);
    } else {
      siteIds[siteName] = site.id;
      console.log(`    ✓ ${siteName}`);
    }
  }

  // 1. Create auth users + profiles
  const profileIds: Record<string, string> = {};

  // Pre-fetch existing users once
  const { data: existingUsers } = await supabase.auth.admin.listUsers();

  for (const u of users) {
    console.log(`  Creating user: ${u.full_name} (${u.email})`);

    const existing = existingUsers?.users?.find(
      (eu) => eu.email === u.email
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
      console.log(`    ↳ Already exists (${userId})`);
    } else {
      // Create user with metadata so handle_new_user can set org_id safely.
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: u.full_name,
          role: u.role,
          org_id: DEMO_ORG_ID,
        },
      });

      if (error) {
        console.error(`    ✗ Failed to create user: ${error.message}`);
        console.error(`    ✗ Error details:`, JSON.stringify(error, null, 2));
        continue;
      }
      userId = data.user.id;
      console.log(`    ✓ Created (${userId})`);
    }

    profileIds[u.email] = userId;

    // Upsert profile directly (service role bypasses RLS)
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        org_id: DEMO_ORG_ID,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error(`    ✗ Profile upsert failed: ${profileError.message}`);
    } else {
      console.log(`    ✓ Profile ready`);
    }
  }

  const managerId = profileIds["david.wong@cleanpro-demo.com"];
  const supervisorId = profileIds["michael.lim@cleanpro-demo.com"];
  const sarahId = profileIds["sarah.tan@cleanpro-demo.com"];
  const ahmadId = profileIds["ahmad.bin@cleanpro-demo.com"];
  const priyaId = profileIds["priya.nair@cleanpro-demo.com"];

  if (!managerId || !supervisorId || !sarahId || !ahmadId || !priyaId) {
    console.error("\n✗ Some users failed to create. Aborting task seeding.");
    process.exit(1);
  }

  // 1b. Set reports_to hierarchy: Staff → Supervisor → Manager
  console.log("\n  Setting up reporting hierarchy...");

  // Supervisor reports to Manager
  await supabase
    .from("profiles")
    .update({ reports_to: managerId })
    .eq("id", supervisorId);
  console.log("    ✓ Michael Lim → reports to → David Wong");

  // Staff report to Supervisor
  for (const staffId of [sarahId, ahmadId, priyaId]) {
    await supabase
      .from("profiles")
      .update({ reports_to: supervisorId })
      .eq("id", staffId);
  }
  console.log("    ✓ Sarah, Ahmad, Priya → report to → Michael Lim");

  // 2. Seed tasks
  console.log("\n  Creating tasks...");

  const taskDefs = [
    // ── 4 Completed tasks ──
    {
      title: "Clean and sanitize all washrooms - Level 3",
      description:
        "Deep clean all 6 washrooms on Level 3 including toilet bowls, sinks, mirrors, and floor mopping. Restock tissue and soap.",
      assigned_to: sarahId,
      created_by: supervisorId,
      site_location: SITES[0],
      priority: "medium" as const,
      status: "completed" as const,
      due_date: daysAgo(1),
      completed_at: daysAgo(1),
    },
    {
      title: "Mop marble flooring - Main lobby",
      description:
        "Use neutral pH floor cleaner on all marble surfaces. Buff to shine. Place wet floor signs during cleaning.",
      assigned_to: ahmadId,
      created_by: supervisorId,
      site_location: SITES[2],
      priority: "high" as const,
      status: "completed" as const,
      due_date: daysAgo(2),
      completed_at: daysAgo(2),
    },
    {
      title: "Glass panel polishing - Entrance facade",
      description:
        "Clean all glass panels at the main entrance using streak-free glass cleaner. Both interior and exterior surfaces.",
      assigned_to: priyaId,
      created_by: supervisorId,
      site_location: SITES[2],
      priority: "low" as const,
      status: "completed" as const,
      due_date: daysAgo(3),
      completed_at: daysAgo(3),
    },
    {
      title: "Sanitize common area furniture",
      description:
        "Wipe down all tables, chairs, and benches in common areas with hospital-grade disinfectant.",
      assigned_to: sarahId,
      created_by: supervisorId,
      site_location: SITES[1],
      priority: "medium" as const,
      status: "completed" as const,
      due_date: hoursAgo(5),
      completed_at: hoursAgo(4),
    },
    // ── 3 Pending tasks (not yet due) ──
    {
      title: "Restock consumables - All dispensers",
      description:
        "Check and refill all soap dispensers, tissue holders, and hand sanitizer stations across all floors.",
      assigned_to: priyaId,
      created_by: supervisorId,
      site_location: SITES[0],
      priority: "medium" as const,
      status: "pending" as const,
      due_date: hoursFromNow(4),
      completed_at: null,
    },
    {
      title: "Vacuum carpeted meeting rooms",
      description:
        "Vacuum all 8 meeting rooms on Level 5. Move chairs and vacuum under tables. Empty vacuum bag after completion.",
      assigned_to: ahmadId,
      created_by: supervisorId,
      site_location: SITES[3],
      priority: "low" as const,
      status: "pending" as const,
      due_date: hoursFromNow(6),
      completed_at: null,
    },
    {
      title: "Wipe down office partitions",
      description:
        "Clean all glass and acrylic partitions in the open office area using anti-static wipes.",
      assigned_to: sarahId,
      created_by: supervisorId,
      site_location: SITES[3],
      priority: "low" as const,
      status: "pending" as const,
      due_date: hoursFromNow(8),
      completed_at: null,
    },
    // ── 3 Overdue tasks (2-4 hours ago) ──
    {
      title: "Deep clean kitchen exhaust hood",
      description:
        "Degrease and clean all kitchen exhaust hood filters and surrounding areas. Use industrial degreaser.",
      assigned_to: ahmadId,
      created_by: supervisorId,
      site_location: SITES[1],
      priority: "high" as const,
      status: "in_progress" as const,
      due_date: hoursAgo(2),
      completed_at: null,
    },
    {
      title: "Clear food waste from bin centre",
      description:
        "Empty all food waste bins, clean bin interiors with bleach solution, replace bin liners. Wash surrounding floor area.",
      assigned_to: sarahId,
      created_by: supervisorId,
      site_location: SITES[1],
      priority: "high" as const,
      status: "pending" as const,
      due_date: hoursAgo(3),
      completed_at: null,
    },
    {
      title: "Polish elevator door panels",
      description:
        "Polish all stainless steel elevator door panels on floors 1-5 using metal polish. Remove fingerprints and smudges.",
      assigned_to: priyaId,
      created_by: supervisorId,
      site_location: SITES[2],
      priority: "medium" as const,
      status: "pending" as const,
      due_date: hoursAgo(4),
      completed_at: null,
    },
    // ── 2 Pending supervisor review (completed, evidence submitted) ──
    {
      title: "Pressure wash car park Level B1",
      description:
        "Pressure wash entire B1 car park floor. Focus on oil stains near parking bays 15-30. Allow 2 hours drying time.",
      assigned_to: ahmadId,
      created_by: supervisorId,
      site_location: SITES[0],
      priority: "medium" as const,
      status: "completed" as const,
      due_date: hoursAgo(1),
      completed_at: hoursAgo(1),
    },
    {
      title: "Descale water features - Lobby fountain",
      description:
        "Descale and clean the lobby water fountain. Drain, scrub with descaling agent, refill with treated water.",
      assigned_to: priyaId,
      created_by: supervisorId,
      site_location: SITES[2],
      priority: "low" as const,
      status: "completed" as const,
      due_date: hoursAgo(2),
      completed_at: hoursAgo(1),
    },
    // ── 2 Escalated tasks (critical) ──
    {
      title: "Emergency spill cleanup - Chemical leak B2",
      description:
        "URGENT: Chemical spill detected in basement B2 storage area. Use spill kit. Follow SDS protocol for cleaning agent residue.",
      assigned_to: sarahId,
      created_by: supervisorId,
      site_location: SITES[3],
      priority: "critical" as const,
      status: "in_progress" as const,
      due_date: hoursAgo(6),
      completed_at: null,
    },
    {
      title: "Repair and clean ceiling water damage - Level 2",
      description:
        "Water stain on ceiling tiles Level 2 corridor. Remove damaged tiles, clean mold if present, coordinate tile replacement.",
      assigned_to: ahmadId,
      created_by: supervisorId,
      site_location: SITES[0],
      priority: "critical" as const,
      status: "pending" as const,
      due_date: hoursAgo(8),
      completed_at: null,
    },
    // ── 1 Rejected task ──
    {
      title: "Floor wax application - Office Level 4",
      description:
        "Apply 3 coats of floor wax to vinyl flooring on Level 4. Allow 45 minutes drying between coats.",
      assigned_to: priyaId,
      created_by: supervisorId,
      site_location: SITES[3],
      priority: "medium" as const,
      status: "rejected" as const,
      due_date: daysAgo(1),
      completed_at: null,
    },
  ];

  // 2a. Probe table/column capabilities for schema compatibility.
  const hasTaskEvidenceTable = await tableExists("task_evidence");
  const hasTaskReviewsTable = await tableExists("task_reviews");
  const hasEscalationsTable = await tableExists("escalations");

  const tasksHasOrgId = await columnExists("tasks", "org_id");
  const tasksHasAssignedTo = await columnExists("tasks", "assigned_to");
  const tasksHasAssignedToId = await columnExists("tasks", "assigned_to_id");
  const tasksHasCreatedBy = await columnExists("tasks", "created_by");
  const tasksHasCreatedById = await columnExists("tasks", "created_by_id");
  const tasksHasSiteId = await columnExists("tasks", "site_id");
  const tasksHasSiteLocation = await columnExists("tasks", "site_location");
  const tasksHasCompletedAt = await columnExists("tasks", "completed_at");
  const tasksHasCategoryId = await columnExists("tasks", "category_id");
  const usesAssignedToIdSchema = tasksHasAssignedToId && !tasksHasAssignedTo;

  const escalationsHasOrgId = hasEscalationsTable
    ? await columnExists("escalations", "org_id")
    : false;

  if (!hasTaskEvidenceTable) {
    console.log('    ⚠ Skipping task evidence seeding (table "task_evidence" not found)');
  }
  if (!hasTaskReviewsTable) {
    console.log('    ⚠ Skipping task reviews seeding (table "task_reviews" not found)');
  }
  if (usesAssignedToIdSchema) {
    console.log("    ↳ Detected legacy task status mapping (todo/approved)");
  }

  // 2b. Clear previous demo tasks to make reseeding deterministic.
  console.log("\n  Clearing previous demo task data...");

  if (hasEscalationsTable && escalationsHasOrgId) {
    const { error: deleteEscalationsError } = await supabase
      .from("escalations")
      .delete()
      .eq("org_id", DEMO_ORG_ID);
    if (deleteEscalationsError) {
      console.error(`    ✗ Delete escalations: ${deleteEscalationsError.message}`);
    }
  }

  if (hasTaskReviewsTable) {
    const reviewsDelete = supabase.from("task_reviews").delete();
    const { error: deleteReviewsError } = tasksHasOrgId
      ? await reviewsDelete.eq("org_id", DEMO_ORG_ID)
      : await reviewsDelete;
    if (deleteReviewsError) {
      console.error(`    ✗ Delete task reviews: ${deleteReviewsError.message}`);
    }
  }

  if (hasTaskEvidenceTable) {
    const evidenceDelete = supabase.from("task_evidence").delete();
    const { error: deleteEvidenceError } = tasksHasOrgId
      ? await evidenceDelete.eq("org_id", DEMO_ORG_ID)
      : await evidenceDelete;
    if (deleteEvidenceError) {
      console.error(`    ✗ Delete task evidence: ${deleteEvidenceError.message}`);
    }
  }

  const taskTitles = taskDefs.map((task) => task.title);
  const tasksDelete = supabase.from("tasks").delete();
  const { error: deleteTasksError } = tasksHasOrgId
    ? await tasksDelete.eq("org_id", DEMO_ORG_ID)
    : await tasksDelete.in("title", taskTitles);
  if (deleteTasksError) {
    console.error(`    ✗ Delete tasks: ${deleteTasksError.message}`);
  } else {
    console.log("    ✓ Existing demo tasks cleared");
  }

  let fallbackCategoryId: string | null = null;
  if (tasksHasCategoryId) {
    const { data: categoryData } = await supabase
      .from("tasks")
      .select("category_id")
      .not("category_id", "is", null)
      .limit(1)
      .maybeSingle();
    fallbackCategoryId = categoryData?.category_id ?? null;
  }

  let fallbackAssignedToId: string | null = null;
  if (tasksHasAssignedToId) {
    const { data: assigneeData } = await supabase
      .from("tasks")
      .select("assigned_to_id")
      .not("assigned_to_id", "is", null)
      .limit(1)
      .maybeSingle();
    fallbackAssignedToId = assigneeData?.assigned_to_id ?? null;
  }

  if (usesAssignedToIdSchema && !fallbackAssignedToId) {
    throw new Error(
      "Could not find a valid assigned_to_id in existing tasks for legacy schema compatibility."
    );
  }

  const taskIdsByIndex: Record<number, string> = {};

  for (const [index, task] of taskDefs.entries()) {
    const mappedStatus = usesAssignedToIdSchema
      ? task.status === "completed"
        ? "approved"
        : "todo"
      : task.status;
    const mappedPriority = usesAssignedToIdSchema && task.priority === "critical"
      ? "high"
      : task.priority;

    const taskInsertPayload: Record<string, unknown> = {
      id: randomUUID(),
      title: task.title,
      description: task.description,
      priority: mappedPriority,
      status: mappedStatus,
      due_date: task.due_date,
    };

    if (tasksHasAssignedTo) taskInsertPayload.assigned_to = task.assigned_to;
    if (tasksHasAssignedToId) {
      taskInsertPayload.assigned_to_id = fallbackAssignedToId ?? task.assigned_to;
    }
    if (tasksHasCreatedBy) taskInsertPayload.created_by = task.created_by;
    if (tasksHasCreatedById) taskInsertPayload.created_by_id = task.created_by;
    if (tasksHasOrgId) taskInsertPayload.org_id = DEMO_ORG_ID;
    if (tasksHasSiteLocation) taskInsertPayload.site_location = task.site_location;
    if (tasksHasCompletedAt) taskInsertPayload.completed_at = task.completed_at;
    if (tasksHasSiteId) {
      taskInsertPayload.site_id = task.site_location ? siteIds[task.site_location] ?? null : null;
    }
    if (tasksHasCategoryId) taskInsertPayload.category_id = fallbackCategoryId;

    const { data, error } = await supabase
      .from("tasks")
      .insert(taskInsertPayload)
      .select("id")
      .single();

    if (error) {
      console.error(`    ✗ Task "${task.title}": ${error.message}`);
    } else {
      taskIdsByIndex[index] = data.id;
      console.log(`    ✓ ${task.title}`);
    }
  }

  if (Object.keys(taskIdsByIndex).length === 0) {
    throw new Error("No tasks were inserted. Check live Supabase schema compatibility.");
  }

  // 3. Add evidence for the 2 "pending review" tasks (index 10, 11)
  console.log("\n  Creating task evidence...");

  const evidenceTasks = [
    {
      taskIndex: 10,
      submitted_by: ahmadId,
      notes:
        "Car park B1 pressure washed. Oil stains removed from bays 15-30. Floor drying in progress.",
    },
    {
      taskIndex: 11,
      submitted_by: priyaId,
      notes:
        "Fountain descaled and refilled. Water pump tested and running smoothly. Before/after photos attached.",
    },
  ];

  if (hasTaskEvidenceTable) {
    const evidenceHasOrgId = await columnExists("task_evidence", "org_id");
    for (const ev of evidenceTasks) {
      const taskId = taskIdsByIndex[ev.taskIndex];
      if (!taskId) continue;
      const evidencePayload: Record<string, unknown> = {
        task_id: taskId,
        submitted_by: ev.submitted_by,
        photo_url: `https://placehold.co/800x600/e2e8f0/475569?text=Evidence+Photo`,
        notes: ev.notes,
      };
      if (evidenceHasOrgId) evidencePayload.org_id = DEMO_ORG_ID;

      const { error } = await supabase.from("task_evidence").insert(evidencePayload);
      if (error) {
        console.error(`    ✗ Evidence: ${error.message}`);
      } else {
        console.log(`    ✓ Evidence for task #${ev.taskIndex + 1}`);
      }
    }
  }

  // 4. Add evidence for completed tasks too (index 0-3)
  const completedEvidence = [
    {
      taskIndex: 0,
      submitted_by: sarahId,
      notes: "All 6 washrooms cleaned and sanitized. Supplies restocked.",
    },
    {
      taskIndex: 1,
      submitted_by: ahmadId,
      notes: "Marble flooring mopped and buffed to shine. Wet floor signs placed.",
    },
    {
      taskIndex: 2,
      submitted_by: priyaId,
      notes: "All entrance glass panels polished. Streak-free finish achieved.",
    },
    {
      taskIndex: 3,
      submitted_by: sarahId,
      notes: "All common area furniture sanitized with hospital-grade disinfectant.",
    },
  ];

  if (hasTaskEvidenceTable) {
    const evidenceHasOrgId = await columnExists("task_evidence", "org_id");
    for (const ev of completedEvidence) {
      const taskId = taskIdsByIndex[ev.taskIndex];
      if (!taskId) continue;
      const evidencePayload: Record<string, unknown> = {
        task_id: taskId,
        submitted_by: ev.submitted_by,
        photo_url: `https://placehold.co/800x600/d1fae5/166534?text=Completed`,
        notes: ev.notes,
      };
      if (evidenceHasOrgId) evidencePayload.org_id = DEMO_ORG_ID;

      const { error } = await supabase.from("task_evidence").insert(evidencePayload);
      if (error) {
        console.error(`    ✗ Evidence: ${error.message}`);
      } else {
        console.log(`    ✓ Evidence for completed task #${ev.taskIndex + 1}`);
      }
    }
  }

  // 5. Add reviews for completed tasks (index 0-3)
  console.log("\n  Creating task reviews...");

  if (hasTaskReviewsTable) {
    const reviewsHasOrgId = await columnExists("task_reviews", "org_id");
    for (let i = 0; i < 4; i++) {
      const taskId = taskIdsByIndex[i];
      if (!taskId) continue;
      const reviewPayload: Record<string, unknown> = {
        task_id: taskId,
        reviewed_by: supervisorId,
        action: "approved",
        comment: "Good work. Standards met.",
      };
      if (reviewsHasOrgId) reviewPayload.org_id = DEMO_ORG_ID;

      const { error } = await supabase.from("task_reviews").insert(reviewPayload);
      if (error) {
        console.error(`    ✗ Review: ${error.message}`);
      } else {
        console.log(`    ✓ Review for task #${i + 1}`);
      }
    }
  }

  // Add rejection review for rejected task (index 14)
  if (hasTaskReviewsTable && taskIdsByIndex[14]) {
    const reviewsHasOrgId = await columnExists("task_reviews", "org_id");
    const rejectionPayload: Record<string, unknown> = {
      task_id: taskIdsByIndex[14],
      reviewed_by: supervisorId,
      action: "rejected",
      comment:
        "Floor wax application incomplete — only 1 coat applied instead of 3. Please redo with full 3 coats.",
    };
    if (reviewsHasOrgId) rejectionPayload.org_id = DEMO_ORG_ID;

    const { error } = await supabase.from("task_reviews").insert(rejectionPayload);
    if (error) {
      console.error(`    ✗ Rejection review: ${error.message}`);
    } else {
      console.log(`    ✓ Rejection review for task #15`);
    }
  }

  // 6. Create escalations for critical tasks (index 12, 13)
  console.log("\n  Creating escalations...");

  const escalationDefs = [
    {
      taskIndex: 12,
      reason:
        "CRITICAL: Chemical spill in B2 has not been fully resolved after 6 hours. Staff reports insufficient spill kit supplies. Needs immediate management intervention.",
    },
    {
      taskIndex: 13,
      reason:
        "CRITICAL: Ceiling water damage on Level 2 worsening. Possible mold risk. Awaiting contractor coordination — requires manager approval for emergency procurement.",
    },
  ];

  if (hasEscalationsTable) {
    const escalationsHasTaskId = await columnExists("escalations", "task_id");
    const escalationsHasFrom = await columnExists("escalations", "escalated_from");
    const escalationsHasTo = await columnExists("escalations", "escalated_to");
    const escalationsHasReason = await columnExists("escalations", "reason");
    const escalationsHasResolved = await columnExists("escalations", "is_resolved");

    for (const esc of escalationDefs) {
      const taskId = taskIdsByIndex[esc.taskIndex];
      if (!taskId) continue;

      const escalationPayload: Record<string, unknown> = {};
      if (escalationsHasTaskId) escalationPayload.task_id = taskId;
      if (escalationsHasFrom) escalationPayload.escalated_from = supervisorId;
      if (escalationsHasTo) escalationPayload.escalated_to = managerId;
      if (escalationsHasReason) escalationPayload.reason = esc.reason;
      if (escalationsHasResolved) escalationPayload.is_resolved = false;
      if (escalationsHasOrgId) escalationPayload.org_id = DEMO_ORG_ID;

      const { error } = await supabase.from("escalations").insert(escalationPayload);
      if (error) {
        console.error(`    ✗ Escalation: ${error.message}`);
      } else {
        console.log(`    ✓ Escalation for task #${esc.taskIndex + 1}`);
      }
    }
  }

  console.log("\n✅ Demo data seeded successfully!");
  console.log("\n🏢 Organization: CleanPro Demo");
  console.log("\n📋 Demo Accounts:");
  console.log("  Manager:    david.wong@cleanpro-demo.com / Demo@1234");
  console.log("  Supervisor: michael.lim@cleanpro-demo.com / Demo@1234");
  console.log("  Staff:      sarah.tan@cleanpro-demo.com / Demo@1234");
  console.log("  Staff:      ahmad.bin@cleanpro-demo.com / Demo@1234");
  console.log("  Staff:      priya.nair@cleanpro-demo.com / Demo@1234");
  console.log("\n📊 Hierarchy:");
  console.log("  David Wong (Manager)");
  console.log("    └─ Michael Lim (Supervisor)");
  console.log("        ├─ Sarah Tan (Staff)");
  console.log("        ├─ Ahmad Bin Yusof (Staff)");
  console.log("        └─ Priya Nair (Staff)");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
