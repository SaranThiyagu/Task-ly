import { NextResponse } from "next/server";
import { checkAndEscalateOverdueTasks } from "@/lib/escalation/escalationEngine";

export async function POST(request: Request) {
  // Verify cron secret to prevent unauthorized invocations
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAndEscalateOverdueTasks();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ESCALATION API] ${new Date().toISOString()} Error:`, message);

    return NextResponse.json(
      { error: "Escalation check failed", details: message },
      { status: 500 }
    );
  }
}
