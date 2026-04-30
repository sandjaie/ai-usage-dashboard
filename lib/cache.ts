import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { UsageSnapshot, type ProviderName } from "@/types/usage";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const MANUAL_DIR = path.join(process.cwd(), "data", "manual");

function getCachePath(provider: ProviderName): string {
  return path.join(CACHE_DIR, `${provider}.json`);
}

function getManualPath(provider: ProviderName): string {
  return path.join(MANUAL_DIR, `${provider}.json`);
}

export async function readCachedSnapshot(
  provider: ProviderName,
): Promise<UsageSnapshot | null> {
  try {
    const content = await readFile(getCachePath(provider), "utf-8");
    return JSON.parse(content) as UsageSnapshot;
  } catch {
    return null;
  }
}

export async function writeCachedSnapshot(snapshot: UsageSnapshot): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(getCachePath(snapshot.provider), JSON.stringify(snapshot, null, 2));
}

export async function readManualSnapshot(
  provider: ProviderName,
): Promise<Partial<UsageSnapshot> | null> {
  try {
    const content = await readFile(getManualPath(provider), "utf-8");
    return JSON.parse(content) as Partial<UsageSnapshot>;
  } catch {
    return null;
  }
}

export async function writeManualSnapshot(
  provider: ProviderName,
  snapshot: Partial<UsageSnapshot>,
): Promise<void> {
  await mkdir(MANUAL_DIR, { recursive: true });
  await writeFile(getManualPath(provider), JSON.stringify(snapshot, null, 2));
}
