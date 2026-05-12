import { mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";

const DEFAULT_URL = "https://ika.clan-world.com/";
const OUTPUT = "docs/assets/clanworld-ika-demo-flow.webm";

async function clickAndPause(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
  await page.waitForTimeout(650);
}

async function browserPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: "docs/assets/.recordings", size: { width: 1440, height: 1000 } }
  });
  const page = await context.newPage();
  return { browser, context, page };
}

async function main() {
  const url = process.env.DEMO_RECORD_URL ?? DEFAULT_URL;
  mkdirSync(dirname(OUTPUT), { recursive: true });
  const { browser, context, page } = await browserPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /Cross-chain agent control room/i }).waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1000);

    for (const label of [
      "Reset",
      "Connect Wallet A",
      "Queue NFT 1",
      "Switch to Wallet B",
      "Queue NFT 2",
      "Start Game",
      "Try Transfer",
      "Reject Bad Action",
      "Mint Player 1",
      "Mint Player 2",
      "End + Thaw",
      "Check Live RPC"
    ]) {
      await clickAndPause(page, label);
    }

    await page.waitForTimeout(1800);
  } finally {
    await context.close();
    await browser.close();
  }

  const recordingDir = resolve("docs/assets/.recordings");
  const newest = readdirSync(recordingDir)
    .filter((name) => name.endsWith(".webm"))
    .map((name) => ({ name, mtime: statSync(join(recordingDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  if (!newest) throw new Error("Playwright did not produce a .webm recording.");

  renameSync(join(recordingDir, newest.name), OUTPUT);
  const size = statSync(OUTPUT).size;
  if (size < 100_000) throw new Error(`Recording is unexpectedly small: ${size} bytes.`);
  console.log(`Recorded ${OUTPUT} (${Math.round(size / 1024)} KiB) from ${url}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
