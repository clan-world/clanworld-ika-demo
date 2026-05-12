import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const required = [
  "README.md",
  "docs/runbook.md",
  "docs/architecture.md",
  "docs/roadmap.md",
  "docs/sources.md",
  "apps/demo-web/src/App.tsx",
  "apps/relayer/src/server.ts",
  "programs/solana-game-manager/programs/solana-game-manager/src/lib.rs",
  "contracts/base-clan-game/contracts/ClanWorldBaseGame.sol",
  "infra/aws/terraform/main.tf",
  "tests/critical-flow.test.ts"
];

let failed = false;
for (const file of required) {
  if (!existsSync(join(root, file))) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
}

const readme = readFileSync(join(root, "README.md"), "utf8");
for (const link of ["docs/runbook.md", "docs/architecture.md", "docs/roadmap.md", "docs/sources.md"]) {
  if (!readme.includes(link)) {
    console.error(`README does not link ${link}`);
    failed = true;
  }
}

const rust = readFileSync(join(root, "programs/solana-game-manager/programs/solana-game-manager/src/lib.rs"), "utf8");
for (const needle of ["freeze_account", "thaw_account", "approve_base_action", "BaseContractNotAllowed"]) {
  if (!rust.includes(needle)) {
    console.error(`Solana program missing ${needle}`);
    failed = true;
  }
}

const solidity = readFileSync(join(root, "contracts/base-clan-game/contracts/ClanWorldBaseGame.sol"), "utf8");
if (!solidity.includes("function mintClan(uint256 nftId) external")) {
  console.error("Base contract should use msg.sender and mintClan(nftId).");
  failed = true;
}

const tests = spawnSync("pnpm", ["exec", "tsx", "--test", "tests/*.test.ts"], {
  cwd: root,
  stdio: "inherit",
  shell: true
});
if (tests.status !== 0) failed = true;

if (failed) process.exit(1);
console.log("Review checks passed.");
