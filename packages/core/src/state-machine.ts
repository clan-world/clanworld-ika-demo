import type { Agent, BaseActionIntent, DemoConfig, DemoEvent, DemoEventType, DemoState } from "./types.ts";

const now = () => new Date().toISOString();

let sequence = 0;
const nextId = (prefix: string) => `${prefix}_${String(++sequence).padStart(4, "0")}`;

export const defaultDemoConfig: DemoConfig = {
  baseContractAddress: "0x1111111111111111111111111111111111111111",
  allowedFunctionNames: ["mintClan"],
  chainId: 84532
};

export function createDemoState(config: DemoConfig = defaultDemoConfig): DemoState {
  sequence = 0;
  const agents: Record<string, Agent> = {
    agent_001: {
      nftId: "agent_001",
      nftMint: "DemoMintAgent001",
      walletId: "wallet_a",
      ownerAddress: "SoLWalletA111111111111111111111111111111111",
      status: "idle",
      isFrozen: false,
      dWalletId: "dwallet_agent_001",
      baseAddress: "0x1000000000000000000000000000000000000001"
    },
    agent_002: {
      nftId: "agent_002",
      nftMint: "DemoMintAgent002",
      walletId: "wallet_b",
      ownerAddress: "SoLWalletB222222222222222222222222222222222",
      status: "idle",
      isFrozen: false,
      dWalletId: "dwallet_agent_002",
      baseAddress: "0x1000000000000000000000000000000000000002"
    },
    agent_003: {
      nftId: "agent_003",
      nftMint: "DemoMintAgent003",
      walletId: "wallet_b",
      ownerAddress: "SoLWalletB222222222222222222222222222222222",
      status: "idle",
      isFrozen: false,
      dWalletId: "dwallet_agent_003",
      baseAddress: "0x1000000000000000000000000000000000000003"
    }
  };

  return {
    wallets: {
      wallet_a: { id: "wallet_a", label: "Wallet A", address: agents.agent_001!.ownerAddress, connected: false },
      wallet_b: { id: "wallet_b", label: "Wallet B", address: agents.agent_002!.ownerAddress, connected: false }
    },
    agents,
    queue: [],
    game: {
      id: "game_001",
      status: "idle",
      selectedNftIds: [],
      baseContractAddress: config.baseContractAddress,
      createdAt: now()
    },
    intents: {},
    events: []
  };
}

function pushEvent(state: DemoState, type: DemoEventType, title: string, message: string, extra: Partial<DemoEvent> = {}) {
  state.events.unshift({ id: nextId("event"), type, title, message, createdAt: now(), ...extra });
}

function getAgent(state: DemoState, nftId: string): Agent {
  const agent = state.agents[nftId];
  if (!agent) throw new Error(`Unknown agent NFT: ${nftId}`);
  return agent;
}

export function connectWallet(state: DemoState, walletId: string): DemoState {
  const wallet = state.wallets[walletId];
  if (!wallet) throw new Error(`Unknown wallet: ${walletId}`);
  wallet.connected = true;
  pushEvent(state, "wallet.connected", `${wallet.label} connected`, `${wallet.address} is ready for Solana devnet actions.`);
  return state;
}

export function queueAgent(state: DemoState, walletId: string, nftId: string): DemoState {
  const agent = getAgent(state, nftId);
  if (agent.walletId !== walletId) throw new Error(`Wallet ${walletId} does not own ${nftId}`);
  if (agent.status !== "idle") throw new Error(`${nftId} is not idle`);
  agent.status = "queued";
  agent.queuePosition = state.queue.length + 1;
  state.queue.push(nftId);
  state.game.status = "forming";
  pushEvent(state, "nft.queued", `${nftId} queued`, `${nftId} entered the Solana game queue.`, { agentNftId: nftId });
  return state;
}

export function startGame(state: DemoState, playerCount = 2): DemoState {
  if (state.queue.length < playerCount) throw new Error(`Need ${playerCount} queued agents`);
  const selected = state.queue.splice(0, playerCount);
  state.game.status = "active";
  state.game.selectedNftIds = selected;
  state.game.startedAt = now();
  pushEvent(state, "game.started", "Game started", `Solana selected ${selected.join(", ")} for ${state.game.id}.`, { gameId: state.game.id });
  selected.forEach((nftId, index) => {
    const agent = getAgent(state, nftId);
    agent.status = "in_game";
    agent.isFrozen = true;
    agent.gameId = state.game.id;
    agent.slot = index + 1;
    delete agent.queuePosition;
    pushEvent(state, "nft.frozen", `${nftId} frozen`, `${nftId} cannot transfer while ${state.game.id} is active.`, {
      agentNftId: nftId,
      gameId: state.game.id,
      proof: { network: "solana-devnet", label: "freeze_account", status: "success" }
    });
  });
  return state;
}

export function attemptTransfer(state: DemoState, nftId: string): { state: DemoState; succeeded: boolean } {
  const agent = getAgent(state, nftId);
  if (agent.isFrozen) {
    pushEvent(state, "transfer.failed", "Transfer failed", `${nftId} is frozen by the active game.`, {
      agentNftId: nftId,
      proof: { network: "solana-devnet", label: "transfer", status: "failed" }
    });
    return { state, succeeded: false };
  }
  pushEvent(state, "transfer.succeeded", "Transfer succeeded", `${nftId} is not frozen and can transfer.`, {
    agentNftId: nftId,
    proof: { network: "solana-devnet", label: "transfer", status: "success" }
  });
  return { state, succeeded: true };
}

export function createBaseIntent(
  state: DemoState,
  nftId: string,
  overrides: Partial<Pick<BaseActionIntent, "baseContractAddress" | "dWalletId" | "baseAddress" | "functionName">> = {}
): BaseActionIntent {
  const agent = getAgent(state, nftId);
  if (!agent.dWalletId || !agent.baseAddress) throw new Error(`${nftId} does not have a dWallet mapping`);
  const intent: BaseActionIntent = {
    id: nextId("intent"),
    gameId: state.game.id,
    nftId,
    dWalletId: overrides.dWalletId ?? agent.dWalletId,
    baseAddress: overrides.baseAddress ?? agent.baseAddress,
    baseContractAddress: overrides.baseContractAddress ?? state.game.baseContractAddress,
    functionName: overrides.functionName ?? "mintClan",
    chainId: 84532,
    nonce: Object.keys(state.intents).length,
    calldataDigest: `digest:${state.game.id}:${nftId}:${Object.keys(state.intents).length}`,
    status: "pending"
  };
  state.intents[intent.id] = intent;
  pushEvent(state, "base.intent.created", "Base intent created", `${intent.functionName} for ${nftId} is waiting for Solana policy approval.`, {
    agentNftId: nftId,
    gameId: state.game.id
  });
  return intent;
}

export function approveBaseIntent(state: DemoState, intentId: string, config: DemoConfig = defaultDemoConfig): BaseActionIntent {
  const intent = state.intents[intentId];
  if (!intent) throw new Error(`Unknown intent: ${intentId}`);
  const agent = getAgent(state, intent.nftId);
  const reasons: string[] = [];

  if (state.game.status !== "active") reasons.push("game is not active");
  if (agent.status !== "in_game" && agent.status !== "minted_on_base") reasons.push("agent is not in game");
  if (!agent.isFrozen) reasons.push("agent NFT is not frozen");
  if (agent.gameId !== intent.gameId) reasons.push("intent game does not match agent game");
  if (agent.dWalletId !== intent.dWalletId) reasons.push("dWallet does not match NFT mapping");
  if (agent.baseAddress?.toLowerCase() !== intent.baseAddress.toLowerCase()) reasons.push("Base address does not match NFT mapping");
  if (intent.baseContractAddress.toLowerCase() !== config.baseContractAddress.toLowerCase()) reasons.push("Base contract is not allowlisted");
  if (!config.allowedFunctionNames.includes(intent.functionName)) reasons.push("function is not allowlisted");
  if (intent.chainId !== config.chainId) reasons.push("wrong chain id");

  if (reasons.length > 0) {
    intent.status = "rejected";
    intent.reason = reasons.join("; ");
    pushEvent(state, "base.intent.rejected", "Intent rejected", intent.reason, {
      agentNftId: intent.nftId,
      gameId: intent.gameId,
      proof: { network: "solana-devnet", label: "approve_base_action", status: "rejected" }
    });
    return intent;
  }

  intent.status = "approved";
  pushEvent(state, "base.intent.approved", "Intent approved", `${intent.nftId} may sign ${intent.functionName} on Base Sepolia.`, {
    agentNftId: intent.nftId,
    gameId: intent.gameId,
    proof: { network: "solana-devnet", label: "approve_base_action", status: "success" }
  });
  return intent;
}

export function markIntentSigned(state: DemoState, intentId: string): DemoState {
  const intent = state.intents[intentId];
  if (!intent) throw new Error(`Unknown intent: ${intentId}`);
  if (intent.status !== "approved") throw new Error(`Intent ${intentId} must be approved before signing`);
  intent.status = "signed";
  pushEvent(state, "ika.signature.completed", "Signature completed", `${intent.dWalletId} signed the Base transaction.`, {
    agentNftId: intent.nftId,
    gameId: intent.gameId,
    proof: { network: "ika-pre-alpha", label: "signature", status: "success" }
  });
  return state;
}

export function confirmBaseMint(state: DemoState, intentId: string, txHash = `0x${"a".repeat(64)}`): DemoState {
  const intent = state.intents[intentId];
  if (!intent) throw new Error(`Unknown intent: ${intentId}`);
  if (intent.status !== "signed" && intent.status !== "relayed") throw new Error(`Intent ${intentId} must be signed before confirmation`);
  intent.status = "confirmed";
  intent.txHash = txHash;
  const agent = getAgent(state, intent.nftId);
  agent.status = "minted_on_base";
  agent.baseClanMinted = true;
  pushEvent(state, "base.tx.confirmed", "Base transaction confirmed", `Base minted clan for ${intent.nftId} from ${intent.baseAddress}.`, {
    agentNftId: intent.nftId,
    gameId: intent.gameId,
    proof: { network: "base-sepolia", label: "mintClan", hash: txHash, status: "success" }
  });
  return state;
}

export function endGame(state: DemoState): DemoState {
  if (state.game.status !== "active") throw new Error("Game is not active");
  state.game.status = "ended";
  state.game.endedAt = now();
  pushEvent(state, "game.ended", "Game ended", `${state.game.id} is complete.`, { gameId: state.game.id });
  for (const nftId of state.game.selectedNftIds) {
    const agent = getAgent(state, nftId);
    agent.isFrozen = false;
    agent.status = "completed";
    pushEvent(state, "nft.thawed", `${nftId} thawed`, `${nftId} can transfer again.`, {
      agentNftId: nftId,
      gameId: state.game.id,
      proof: { network: "solana-devnet", label: "thaw_account", status: "success" }
    });
  }
  return state;
}
