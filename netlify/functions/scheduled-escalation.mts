import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // Call the escalation API route internally
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (cronSecret) {
    headers["authorization"] = `Bearer ${cronSecret}`;
  }

  try {
    const response = await fetch(`${siteUrl}/api/escalation`, {
      method: "POST",
      headers,
    });

    const data = await response.json();
    console.log("[SCHEDULED ESCALATION]", JSON.stringify(data));

    return new Response(JSON.stringify(data), { status: response.status });
  } catch (error) {
    console.error("[SCHEDULED ESCALATION] Failed:", error);
    return new Response(JSON.stringify({ error: "Scheduled escalation failed" }), {
      status: 500,
    });
  }
};

export const config: Config = {
  schedule: "*/30 * * * *",
};
