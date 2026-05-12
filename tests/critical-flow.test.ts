import assert from "node:assert/strict";
import test from "node:test";
import {
  approveBaseIntent,
  attemptTransfer,
  confirmBaseMint,
  connectWallet,
  createBaseIntent,
  createDemoState,
  defaultDemoConfig,
  endGame,
  markIntentSigned,
  queueAgent,
  startGame
} from "../packages/core/src/index.ts";

test("critical path: queue, freeze, failed transfer, mint on Base, thaw", () => {
  const state = createDemoState();
  connectWallet(state, "wallet_a");
  queueAgent(state, "wallet_a", "agent_001");
  connectWallet(state, "wallet_b");
  queueAgent(state, "wallet_b", "agent_002");

  startGame(state, 2);

  assert.equal(state.game.status, "active");
  assert.equal(state.agents.agent_001?.isFrozen, true);
  assert.equal(state.agents.agent_002?.isFrozen, true);

  const transfer = attemptTransfer(state, "agent_001");
  assert.equal(transfer.succeeded, false);

  const intent = createBaseIntent(state, "agent_001");
  const approved = approveBaseIntent(state, intent.id);
  assert.equal(approved.status, "approved");

  markIntentSigned(state, intent.id);
  confirmBaseMint(state, intent.id, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(state.agents.agent_001?.baseClanMinted, true);

  endGame(state);
  assert.equal(state.agents.agent_001?.isFrozen, false);

  const afterThawTransfer = attemptTransfer(state, "agent_001");
  assert.equal(afterThawTransfer.succeeded, true);
});

test("policy rejects wrong Base contract before signing", () => {
  const state = createDemoState();
  queueAgent(state, "wallet_a", "agent_001");
  queueAgent(state, "wallet_b", "agent_002");
  startGame(state, 2);

  const intent = createBaseIntent(state, "agent_001", {
    baseContractAddress: "0x9999999999999999999999999999999999999999"
  });
  const decision = approveBaseIntent(state, intent.id, defaultDemoConfig);

  assert.equal(decision.status, "rejected");
  assert.match(decision.reason ?? "", /Base contract is not allowlisted/);
});

test("policy rejects mismatched dWallet mapping", () => {
  const state = createDemoState();
  queueAgent(state, "wallet_a", "agent_001");
  queueAgent(state, "wallet_b", "agent_002");
  startGame(state, 2);

  const intent = createBaseIntent(state, "agent_001", { dWalletId: "dwallet_agent_002" });
  const decision = approveBaseIntent(state, intent.id);

  assert.equal(decision.status, "rejected");
  assert.match(decision.reason ?? "", /dWallet does not match/);
});
