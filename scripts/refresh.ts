import { refreshAllProviders } from "@/lib/usage-service";

async function main() {
  const result = await refreshAllProviders();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
