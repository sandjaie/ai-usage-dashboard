export type ProviderName = "claude" | "codex";

export type UsageStatus = "ok" | "warning" | "near_limit" | "unknown";

export type UsageSnapshot = {
  provider: ProviderName;
  sessionUsagePercent?: number;
  fiveHourUsagePercent?: number;
  weeklyUsagePercent?: number;
  monthlyUsagePercent?: number;
  resetTime?: string;
  lastChecked: string;
  status: UsageStatus;
  raw?: unknown;
};

export type ProviderFetchResult = {
  snapshot: UsageSnapshot;
  warning?: string;
  source: "live" | "manual" | "cache" | "unknown";
};
