import { readFile } from "node:fs/promises";
import path from "node:path";
import { readManualSnapshot } from "@/lib/cache";
import { clampPercent, deriveStatus, parseFirstPercent, runCommand } from "@/lib/provider-utils";
import { ProviderFetchResult, UsageSnapshot } from "@/types/usage";

const PLAYWRIGHT_OUTPUT = path.join(process.cwd(), "data", "playwright", "codex-latest.json");

function buildSnapshot(input: Partial<UsageSnapshot>, raw?: unknown): UsageSnapshot {
  const snapshot: UsageSnapshot = {
    provider: "codex",
    fiveHourUsagePercent: clampPercent(input.fiveHourUsagePercent),
    weeklyUsagePercent: clampPercent(input.weeklyUsagePercent),
    resetTime: input.resetTime,
    lastChecked: new Date().toISOString(),
    status: "unknown",
    raw,
  };
  snapshot.status = deriveStatus(snapshot);
  return snapshot;
}

async function readPlaywrightOutput(): Promise<Partial<UsageSnapshot> | null> {
  try {
    const content = await readFile(PLAYWRIGHT_OUTPUT, "utf-8");
    return JSON.parse(content) as Partial<UsageSnapshot>;
  } catch {
    return null;
  }
}

export async function fetchCodexUsage(): Promise<ProviderFetchResult> {
  // TODO: Expand parser with provider-specific DOM selectors once the exact
  // usage page structure is confirmed in your local account.
  const commandOutput = await runCommand(process.env.CODEX_STATUS_COMMAND);
  if (commandOutput) {
    const snapshot = buildSnapshot(
      {
        fiveHourUsagePercent: parseFirstPercent(commandOutput, /(?:5[- ]?hour|5h).*?(\d{1,3}(?:\.\d+)?)\s*%/i),
        weeklyUsagePercent: parseFirstPercent(commandOutput, /weekly.*?(\d{1,3}(?:\.\d+)?)\s*%/i),
        resetTime: commandOutput.match(/reset(?:\s*time)?[:\s]+([^\n]+)/i)?.[1]?.trim(),
      },
      { commandOutput },
    );

    if (snapshot.status !== "unknown") {
      return { snapshot, source: "live" };
    }
  }

  const fromPlaywright = await readPlaywrightOutput();
  if (fromPlaywright) {
    const snapshot = buildSnapshot(fromPlaywright, { playwright: fromPlaywright });
    if (snapshot.status !== "unknown") {
      return { snapshot, source: "live" };
    }
  }

  const manual = await readManualSnapshot("codex");
  if (manual) {
    const snapshot = buildSnapshot(manual, { manual });
    return { snapshot, source: "manual", warning: "Using manual Codex snapshot." };
  }

  return {
    snapshot: buildSnapshot({}),
    source: "unknown",
    warning:
      "Could not fetch live Codex usage. Configure CODEX_STATUS_COMMAND, run npm run playwright:codex, or update manual JSON.",
  };
}
