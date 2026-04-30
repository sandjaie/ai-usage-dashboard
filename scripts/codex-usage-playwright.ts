import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const usageUrl = process.env.CODEX_USAGE_URL;
const profileDir = process.env.PLAYWRIGHT_PROFILE_DIR || path.join(process.cwd(), ".playwright-profile");
const outputPath = path.join(process.cwd(), "data", "playwright", "codex-latest.json");

function parsePercent(label: string, text: string): number | undefined {
  const regex = new RegExp(`${label}[^\\n\\r]*?(\\d{1,3}(?:\\.\\d+)?)\\s*%`, "i");
  const match = text.match(regex);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(100, value));
}

async function main() {
  if (!usageUrl) {
    throw new Error("CODEX_USAGE_URL is required. Add it to .env.local first.");
  }

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(usageUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Manual-login friendly flow: user can sign in once and the persistent profile keeps cookies.
    const text = await page.locator("body").innerText();
    const snapshot = {
      provider: "codex",
      fiveHourUsagePercent: parsePercent("5-hour|5 hour|5h", text),
      weeklyUsagePercent: parsePercent("weekly", text),
      resetTime: text.match(/reset[^:\n\r]*[:\s]+([^\n\r]+)/i)?.[1]?.trim(),
      lastChecked: new Date().toISOString(),
      status: "unknown",
      raw: { source: "playwright", url: usageUrl },
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(snapshot, null, 2));
    process.stdout.write(`Saved: ${outputPath}\n`);
  } finally {
    await context.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
