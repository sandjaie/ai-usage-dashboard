import { NextRequest, NextResponse } from "next/server";
import { getUsageSnapshot, refreshAllProviders } from "@/lib/usage-service";
import { ProviderName } from "@/types/usage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { provider?: ProviderName | "all" };
  if (!body.provider || body.provider === "all") {
    const data = await refreshAllProviders();
    return NextResponse.json(data);
  }

  if (body.provider !== "claude" && body.provider !== "codex") {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  const result = await getUsageSnapshot(body.provider);
  return NextResponse.json({ [body.provider]: result });
}
