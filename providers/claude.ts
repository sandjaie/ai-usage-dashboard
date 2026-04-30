import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readManualSnapshot } from "@/lib/cache";
import { clampPercent, deriveStatus, parseFirstPercent, runCommand } from "@/lib/provider-utils";
import { ProviderFetchResult, UsageSnapshot } from "@/types/usage";

async function readLikelyClaudeLocalStatus(): Promise<unknown | null> {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".config", "claude", "status.json"),
    path.join(home, ".claude", "status.json"),
    path.join(home, ".claude", "session.json"),
  ];

  for (const filePath of candidates) {
    try {
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      // Keep trying other local paths.
    }
  }

  return null;
}

function buildSnapshot(input: Partial<UsageSnapshot>, raw?: unknown): UsageSnapshot {
  const snapshot: UsageSnapshot = {
    provider: "claude",
    sessionUsagePercent: clampPercent(input.sessionUsagePercent),
    weeklyUsagePercent: clampPercent(input.weeklyUsagePercent),
    monthlyUsagePercent: clampPercent(input.monthlyUsagePercent),
    resetTime: input.resetTime,
    lastChecked: new Date().toISOString(),
    status: "unknown",
    raw,
  };
  snapshot.status = deriveStatus(snapshot);
  return snapshot;
}

export async function fetchClaudeUsage(): Promise<ProviderFetchResult> {
  const commandOutput = await runCommand(process.env.CLAUDE_STATUS_COMMAND);
  if (commandOutput) {
    const snapshot = buildSnapshot(
      {
        sessionUsagePercent: parseFirstPercent(
          commandOutput,
          /(?:session|current).*?(\d{1,3}(?:\.\d+)?)\s*%/i,
        ),
        weeklyUsagePercent: parseFirstPercent(commandOutput, /weekly.*?(\d{1,3}(?:\.\d+)?)\s*%/i),
        monthlyUsagePercent: parseFirstPercent(
          commandOutput,
          /monthly.*?(\d{1,3}(?:\.\d+)?)\s*%/i,
        ),
        resetTime: commandOutput.match(/reset(?:\s*time)?[:\s]+([^\n]+)/i)?.[1]?.trim(),
      },
      { commandOutput },
    );

    if (snapshot.status !== "unknown") {
      return { snapshot, source: "live" };
    }
  }

  const localStatus = await readLikelyClaudeLocalStatus();
  if (localStatus && typeof localStatus === "object") {
    const asRecord = localStatus as Record<string, unknown>;
    const snapshot = buildSnapshot(
      {
        sessionUsagePercent: Number(asRecord.sessionUsagePercent),
        weeklyUsagePercent: Number(asRecord.weeklyUsagePercent),
        monthlyUsagePercent: Number(asRecord.monthlyUsagePercent),
        resetTime: typeof asRecord.resetTime === "string" ? asRecord.resetTime : undefined,
      },
      localStatus,
    );

    if (snapshot.status !== "unknown") {
      return { snapshot, source: "live" };
    }
  }

  const manual = await readManualSnapshot("claude");
  if (manual) {
    const snapshot = buildSnapshot(manual, { manual });
    return { snapshot, source: "manual", warning: "Using manual Claude snapshot." };
  }

  return {
    snapshot: buildSnapshot({}),
    source: "unknown",
    warning:
      "Could not fetch live Claude usage. Add CLAUDE_STATUS_COMMAND, provide manual JSON, or implement browser automation TODO in providers/claude.ts.",
  };
}

// TODO: Add Playwright usage-page scraping using CLAUDE_USAGE_URL in a persistent profile,
// following the same local-session approach used in scripts/codex-usage-playwright.ts.
