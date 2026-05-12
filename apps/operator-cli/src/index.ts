import { approveBaseIntent, createBaseIntent, createDemoState, queueAgent, startGame } from "@clanworld/core";

const command = process.argv[2] ?? "help";

if (command === "dry-run") {
  const state = createDemoState();
  queueAgent(state, "wallet_a", "agent_001");
  queueAgent(state, "wallet_b", "agent_002");
  startGame(state, 2);
  const intent = createBaseIntent(state, "agent_001");
  approveBaseIntent(state, intent.id);
  console.log(JSON.stringify(state, null, 2));
} else {
  console.log("Commands: pnpm --filter @clanworld/operator-cli dev dry-run");
}
