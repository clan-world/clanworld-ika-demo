import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const out = "/mnt/data/clanworld-ika-demo.zip";
if (existsSync(out)) rmSync(out);
const result = spawnSync("zip", ["-qr", out, "clanworld-ika-demo", "-x", "**/node_modules/**", "**/node_modules/", "**/node_modules", "**/.terraform/**", "**/target/**", "**/dist/**", "**/cache/**", "**/.DS_Store"], {
  cwd: "/mnt/data",
  stdio: "inherit"
});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(out);
