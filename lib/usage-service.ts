import { readCachedSnapshot, writeCachedSnapshot, writeManualSnapshot } from "@/lib/cache";
import { fetchClaudeUsage } from "@/providers/claude";
import { fetchCodexUsage } from "@/providers/codex";
import { ProviderFetchResult, ProviderName, UsageSnapshot } from "@/types/usage";

async function fetchLive(provider: ProviderName): Promise<ProviderFetchResult> {
  if (provider === "claude") return fetchClaudeUsage();
  return fetchCodexUsage();
}

export async function getUsageSnapshot(provider: ProviderName): Promise<ProviderFetchResult> {
  const liveResult = await fetchLive(provider);
  if (liveResult.snapshot.status !== "unknown") {
    await writeCachedSnapshot(liveResult.snapshot);
    return liveResult;
  }

  const cached = await readCachedSnapshot(provider);
  if (cached) {
    return {
      source: "cache",
      snapshot: {
        ...cached,
        lastChecked: cached.lastChecked ?? new Date().toISOString(),
      },
      warning: liveResult.warning ?? `Could not fetch live ${provider} usage. Showing last cached snapshot.`,
    };
  }

  return liveResult;
}

export async function setManualSnapshot(
  provider: ProviderName,
  payload: Partial<UsageSnapshot>,
): Promise<UsageSnapshot> {
  const now = new Date().toISOString();
  const snapshot: UsageSnapshot = {
    provider,
    sessionUsagePercent: payload.sessionUsagePercent,
    fiveHourUsagePercent: payload.fiveHourUsagePercent,
    weeklyUsagePercent: payload.weeklyUsagePercent,
    monthlyUsagePercent: payload.monthlyUsagePercent,
    resetTime: payload.resetTime,
    lastChecked: now,
    status: payload.status ?? "unknown",
    raw: payload.raw,
  };
  await writeManualSnapshot(provider, snapshot);
  await writeCachedSnapshot(snapshot);
  return snapshot;
}

export async function refreshAllProviders(): Promise<Record<ProviderName, ProviderFetchResult>> {
  const [claude, codex] = await Promise.all([getUsageSnapshot("claude"), getUsageSnapshot("codex")]);
  return { claude, codex };
}
