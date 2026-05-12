import "dotenv/config";
import cors from "cors";
import express from "express";
import { encodeMintClan, mintClanWithPrivateKey, relaySignedBaseTransaction } from "@clanworld/base-sdk";
import { loadConfig } from "@clanworld/config";
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
  startGame,
  type DemoState
} from "@clanworld/core";
import { createSigningAdapter } from "@clanworld/signing-adapter";
import { privateKeyToAccount } from "viem/accounts";

const app = express();
const config = loadConfig();
const demoConfig = {
  ...defaultDemoConfig,
  baseContractAddress: config.baseClanGameAddress,
  chainId: config.baseChainId
};
const signer = createSigningAdapter(config);
let state: DemoState = hydrateMappings(createDemoState(demoConfig));
const subscribers = new Set<express.Response>();

function deriveMockAddresses() {
  return config.mockDWalletPrivateKeys.flatMap((key) => {
    try {
      return [privateKeyToAccount(key as `0x${string}`).address];
    } catch {
      return [];
    }
  });
}

function hydrateMappings(nextState: DemoState): DemoState {
  const addresses = config.dWalletBaseAddresses.length > 0 ? config.dWalletBaseAddresses : deriveMockAddresses();
  for (const [index, nftId] of ["agent_001", "agent_002", "agent_003"].entries()) {
    const agent = nextState.agents[nftId];
    const address = addresses[index];
    if (agent && address?.startsWith("0x")) agent.baseAddress = address;
  }
  return nextState;
}

async function maybeRelayLiveBaseMint(nftId: string, signedTransaction: `0x${string}` | undefined, fallbackPrivateKey: string | undefined) {
  if (!config.liveBaseRelay) return undefined;
  if (signer.name === "ika") {
    if (!signedTransaction) throw new Error("Ika live relay needs a signed raw Base transaction.");
    return relaySignedBaseTransaction({ rpcUrl: config.baseSepoliaRpcUrl, signedTransaction });
  }
  if (!fallbackPrivateKey) throw new Error("LIVE_BASE_RELAY=true requires a matching mock dWallet private key.");
  return mintClanWithPrivateKey({
    rpcUrl: config.baseSepoliaRpcUrl,
    privateKey: fallbackPrivateKey as `0x${string}`,
    contractAddress: config.baseClanGameAddress as `0x${string}`,
    nftId
  });
}


app.use(cors());
app.use(express.json());

function publish() {
  const payload = JSON.stringify({ type: "state", state });
  for (const res of subscribers) res.write(`data: ${payload}\n\n`);
}

function safeRoute(fn: express.RequestHandler): express.RequestHandler {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, signingAdapter: signer.name, baseContract: config.baseClanGameAddress, liveBaseRelay: config.liveBaseRelay });
});

app.get("/api/live/status", safeRoute(async (_req, res) => {
  const [solana, base] = await Promise.allSettled([
    fetch(config.solanaRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot" })
    }).then((r) => r.json()),
    fetch(config.baseSepoliaRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })
    }).then((r) => r.json())
  ]);

  res.json({
    solanaDevnetSlot: solana.status === "fulfilled" ? solana.value.result : null,
    baseSepoliaBlockHex: base.status === "fulfilled" ? base.value.result : null
  });
}));

app.get("/api/demo/state", (_req, res) => res.json(state));

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`data: ${JSON.stringify({ type: "state", state })}\n\n`);
  subscribers.add(res);
  req.on("close", () => subscribers.delete(res));
});

app.post("/api/demo/reset", safeRoute((_req, res) => {
  state = hydrateMappings(createDemoState(demoConfig));
  publish();
  res.json(state);
}));

app.post("/api/demo/connect-wallet", safeRoute((req, res) => {
  state = connectWallet(state, req.body.walletId ?? "wallet_a");
  publish();
  res.json(state);
}));

app.post("/api/demo/queue", safeRoute((req, res) => {
  state = queueAgent(state, req.body.walletId, req.body.nftId);
  publish();
  res.json(state);
}));

app.post("/api/demo/start-game", safeRoute((_req, res) => {
  state = startGame(state, 2);
  publish();
  res.json(state);
}));

app.post("/api/demo/try-transfer", safeRoute((req, res) => {
  const result = attemptTransfer(state, req.body.nftId);
  state = result.state;
  publish();
  res.json({ succeeded: result.succeeded, state });
}));

app.post("/api/demo/invalid-action", safeRoute((req, res) => {
  const intent = createBaseIntent(state, req.body.nftId ?? "agent_001", {
    baseContractAddress: "0x9999999999999999999999999999999999999999"
  });
  const decision = approveBaseIntent(state, intent.id, demoConfig);
  publish();
  res.json({ decision, state });
}));

app.post("/api/demo/mint-on-base", safeRoute(async (req, res) => {
  const nftId = req.body.nftId as string;
  const intent = createBaseIntent(state, nftId);
  const decision = approveBaseIntent(state, intent.id, demoConfig);
  if (decision.status !== "approved") {
    publish();
    res.status(400).json({ decision, state });
    return;
  }

  const data = encodeMintClan(nftId);
  const matchingPrivateKey = config.mockDWalletPrivateKeys.find((key) => {
    try { return privateKeyToAccount(key as `0x${string}`).address.toLowerCase() === decision.baseAddress.toLowerCase(); }
    catch { return false; }
  }) ?? config.mockDWalletPrivateKeys[0];
  const signed = await signer.signBaseTransaction({
    intent: decision,
    to: config.baseClanGameAddress as `0x${string}`,
    data,
    value: 0n
  });
  state = markIntentSigned(state, intent.id);

  const liveTxHash = await maybeRelayLiveBaseMint(nftId, signed.signedTransaction, matchingPrivateKey);
  state = confirmBaseMint(state, intent.id, liveTxHash ?? `0x${intent.id.replace(/[^a-f0-9]/gi, "").padEnd(64, "0").slice(0, 64)}`);
  publish();
  res.json({ intent: state.intents[intent.id], state });
}));

app.post("/api/demo/end-game", safeRoute((_req, res) => {
  state = endGame(state);
  publish();
  res.json(state);
}));

const server = app.listen(config.port, () => {
  console.log(`Clan World relayer listening on http://localhost:${config.port}`);
});

process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
