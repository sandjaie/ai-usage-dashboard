import { exec } from "node:child_process";
import { promisify } from "node:util";
import { UsageSnapshot, type UsageStatus } from "@/types/usage";

const execAsync = promisify(exec);

export function clampPercent(value: number | undefined): number | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(100, value));
}

export function deriveStatus(snapshot: Partial<UsageSnapshot>): UsageStatus {
  const candidates = [
    snapshot.sessionUsagePercent,
    snapshot.fiveHourUsagePercent,
    snapshot.weeklyUsagePercent,
    snapshot.monthlyUsagePercent,
  ].filter((v): v is number => typeof v === "number");

  if (candidates.length === 0) return "unknown";
  const max = Math.max(...candidates);
  if (max >= 90) return "near_limit";
  if (max >= 75) return "warning";
  return "ok";
}

export function parseFirstPercent(input: string, regex: RegExp): number | undefined {
  const match = input.match(regex);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return undefined;
  return clampPercent(value);
}

export async function runCommand(command?: string): Promise<string | null> {
  if (!command) return null;
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return `${stdout}\n${stderr}`.trim();
  } catch {
    return null;
  }
}
