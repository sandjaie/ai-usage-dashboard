"use client";

import { useEffect, useMemo, useState } from "react";
import { UsageCard } from "@/components/usage-card";
import { ProviderName, ProviderFetchResult, UsageSnapshot } from "@/types/usage";

type DashboardState = {
  claude?: ProviderFetchResult;
  codex?: ProviderFetchResult;
};

export default function Home() {
  const [data, setData] = useState<DashboardState>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const loaded = useMemo(() => Boolean(data.claude || data.codex), [data]);

  useEffect(() => {
    void refreshAll();
  }, []);

  async function fetchProvider(provider: ProviderName) {
    const response = await fetch(`/api/usage/${provider}`);
    const json = (await response.json()) as ProviderFetchResult;
    setData((prev) => ({ ...prev, [provider]: json }));
  }

  async function refreshProvider(provider: ProviderName) {
    setLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      await fetchProvider(provider);
    } finally {
      setLoading((prev) => ({ ...prev, [provider]: false }));
    }
  }

  async function refreshAll() {
    setLoading((prev) => ({ ...prev, all: true }));
    try {
      const response = await fetch("/api/usage/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "all" }),
      });
      const json = (await response.json()) as Record<ProviderName, ProviderFetchResult>;
      setData(json);
    } finally {
      setLoading((prev) => ({ ...prev, all: false }));
    }
  }

  async function saveManual(provider: ProviderName, payload: Partial<UsageSnapshot>) {
    await fetch(`/api/usage/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await refreshProvider(provider);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">AI Usage Dashboard</h1>
          <p className="text-sm text-zinc-500">Local-only dashboard for Claude Code and Codex usage.</p>
        </div>
        <button
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          onClick={refreshAll}
          disabled={Boolean(loading.all)}
        >
          {loading.all ? "Refreshing..." : "Refresh All"}
        </button>
      </header>

      {!loaded && (
        <p className="mb-4 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
          Loading latest snapshots...
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <UsageCard
          title="Claude Code Usage"
          description="Session, weekly, and monthly usage overview."
          snapshot={data.claude?.snapshot}
          warning={data.claude?.warning}
          loading={Boolean(loading.claude)}
          onRefresh={() => void refreshProvider("claude")}
          onManualSave={(payload) => saveManual("claude", payload)}
        />
        <UsageCard
          title="Codex Usage"
          description="5-hour window and weekly usage overview."
          snapshot={data.codex?.snapshot}
          warning={data.codex?.warning}
          loading={Boolean(loading.codex)}
          onRefresh={() => void refreshProvider("codex")}
          onManualSave={(payload) => saveManual("codex", payload)}
        />
      </div>
    </main>
  );
}
