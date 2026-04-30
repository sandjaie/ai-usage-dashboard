"use client";

import { UsageSnapshot } from "@/types/usage";

type UsageCardProps = {
  title: string;
  description: string;
  snapshot?: UsageSnapshot;
  warning?: string;
  loading?: boolean;
  onRefresh: () => void;
  onManualSave: (payload: Partial<UsageSnapshot>) => Promise<void>;
};

function statusLabel(status?: UsageSnapshot["status"]): string {
  if (status === "ok") return "OK";
  if (status === "warning") return "Warning";
  if (status === "near_limit") return "Near limit";
  return "Unknown";
}

function progressClass(percent?: number): string {
  if (percent === undefined) return "bg-zinc-300";
  if (percent >= 90) return "bg-red-500";
  if (percent >= 75) return "bg-amber-500";
  return "bg-emerald-500";
}

function StatRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value ?? "Unknown"}</span>
    </div>
  );
}

export function UsageCard({
  title,
  description,
  snapshot,
  warning,
  loading,
  onRefresh,
  onManualSave,
}: UsageCardProps) {
  const mainPercent = snapshot?.sessionUsagePercent ?? snapshot?.fiveHourUsagePercent;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
        <button
          onClick={onRefresh}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Refreshing..." : `Refresh ${title.includes("Claude") ? "Claude" : "Codex"}`}
        </button>
      </div>

      <div className="mb-3 h-2 w-full rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${progressClass(mainPercent)}`}
          style={{ width: `${mainPercent ?? 0}%` }}
        />
      </div>

      <div className="space-y-2">
        <StatRow
          label={title.includes("Claude") ? "Current session usage" : "5-hour window usage"}
          value={mainPercent !== undefined ? `${mainPercent}%` : undefined}
        />
        <StatRow
          label="Weekly usage"
          value={snapshot?.weeklyUsagePercent !== undefined ? `${snapshot.weeklyUsagePercent}%` : undefined}
        />
        {title.includes("Claude") && (
          <StatRow
            label="Monthly usage"
            value={
              snapshot?.monthlyUsagePercent !== undefined ? `${snapshot.monthlyUsagePercent}%` : undefined
            }
          />
        )}
        <StatRow label="Reset time" value={snapshot?.resetTime} />
        <StatRow
          label="Last checked"
          value={snapshot?.lastChecked ? new Date(snapshot.lastChecked).toLocaleString() : undefined}
        />
        <StatRow label="Status" value={statusLabel(snapshot?.status)} />
      </div>

      {warning && <p className="mt-4 text-xs text-amber-700">{warning}</p>}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">Manual JSON update</summary>
        <ManualForm onSave={onManualSave} />
      </details>
    </section>
  );
}

function ManualForm({ onSave }: { onSave: (payload: Partial<UsageSnapshot>) => Promise<void> }) {
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const formData = new FormData(event.currentTarget);
          const input = formData.get("payload")?.toString() ?? "{}";
          const parsed = JSON.parse(input) as Partial<UsageSnapshot>;
          await onSave(parsed);
        } catch {
          window.alert("Invalid JSON. Please fix formatting and try again.");
        }
      }}
    >
      <textarea
        name="payload"
        className="h-28 w-full rounded-md border border-zinc-300 p-2 font-mono text-xs"
        defaultValue='{"weeklyUsagePercent": 42, "resetTime": "2026-05-01T00:00:00Z"}'
      />
      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Save manual snapshot
      </button>
    </form>
  );
}
