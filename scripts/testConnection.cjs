const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("❌ Missing env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  console.log("🔍 Testing Supabase connection...\n");
  console.log(`  URL: ${url}`);
  console.log(`  Key: ${key.slice(0, 20)}...${key.slice(-10)}\n`);

  // Test auth admin
  const { data: users, error: authErr } =
    await supabase.auth.admin.listUsers();
  if (authErr) {
    console.log(`  Auth Admin: ❌ ${authErr.message}`);
  } else {
    console.log(
      `  Auth Admin: ✅ OK (${users?.users?.length || 0} existing users)`
    );
  }

  // Check tables
  const tables = [
    "profiles",
    "tasks",
    "task_evidence",
    "task_reviews",
    "escalations",
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).select("id").limit(1);
    if (error) {
      console.log(`  Table ${t}: ❌ ${error.message}`);
    } else {
      console.log(`  Table ${t}: ✅ OK`);
    }
  }

  console.log("\nDone.");
}

test();
