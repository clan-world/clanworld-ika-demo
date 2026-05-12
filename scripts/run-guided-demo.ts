const api = process.env.DEMO_API_URL ?? "http://localhost:8787";

async function post(path: string, body: Record<string, unknown> = {}) {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path}: ${await response.text()}`);
  return response.json();
}

async function main() {
  const steps: [string, string, Record<string, unknown>?][] = [
    ["Reset", "/api/demo/reset"],
    ["Connect Wallet A", "/api/demo/connect-wallet", { walletId: "wallet_a" }],
    ["Queue Agent 1", "/api/demo/queue", { walletId: "wallet_a", nftId: "agent_001" }],
    ["Connect Wallet B", "/api/demo/connect-wallet", { walletId: "wallet_b" }],
    ["Queue Agent 2", "/api/demo/queue", { walletId: "wallet_b", nftId: "agent_002" }],
    ["Start Game", "/api/demo/start-game"],
    ["Try Transfer", "/api/demo/try-transfer", { nftId: "agent_001" }],
    ["Reject Bad Action", "/api/demo/invalid-action", { nftId: "agent_001" }],
    ["Mint Agent 1", "/api/demo/mint-on-base", { nftId: "agent_001" }],
    ["Mint Agent 2", "/api/demo/mint-on-base", { nftId: "agent_002" }],
    ["End Game", "/api/demo/end-game"]
  ];

  for (const [label, path, body] of steps) {
    console.log(`> ${label}`);
    await post(path, body ?? {});
  }
  console.log("Guided demo complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
