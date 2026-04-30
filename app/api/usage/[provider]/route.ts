import { NextRequest, NextResponse } from "next/server";
import { getUsageSnapshot, setManualSnapshot } from "@/lib/usage-service";
import { ProviderName } from "@/types/usage";

export const runtime = "nodejs";

function parseProvider(value: string): ProviderName | null {
  if (value === "claude" || value === "codex") return value;
  return null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = parseProvider(rawProvider);
  if (!provider) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  const result = await getUsageSnapshot(provider);
  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = parseProvider(rawProvider);
  if (!provider) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  const payload = await request.json();
  const snapshot = await setManualSnapshot(provider, payload);
  return NextResponse.json({ snapshot, source: "manual" });
}
