import { useEffect, useMemo, useState } from "react";
import type { Agent, DemoState } from "@clanworld/core";
import { demoApi, loadLiveStatus, loadState, subscribe } from "./api.ts";

type WalletConnection = { connected: boolean; address?: string; error?: string };

export function App() {
  const [state, setState] = useState<DemoState | null>(null);
  const [wallet, setWallet] = useState<WalletConnection>({ connected: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<{ solanaDevnetSlot: number | null; baseSepoliaBlockHex: string | null } | null>(null);

  useEffect(() => {
    loadState().then(setState).catch(console.error);
    loadLiveStatus().then(setLiveStatus).catch(console.error);
    return subscribe(setState);
  }, []);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    try {
      const result = await action();
      if (result && typeof result === "object" && "state" in result) setState((result as { state: DemoState }).state);
      else if (result) setState(result as DemoState);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }

  async function connectPhantom() {
    if (!window.solana?.connect) {
      setWallet({ connected: false, error: "Install Phantom or another injected Solana wallet." });
      return;
    }
    const response = await window.solana.connect();
    setWallet({ connected: true, address: response.publicKey.toString() });
  }

  const agents = useMemo(() => Object.values(state?.agents ?? {}), [state]);
  const queuedAgents = state?.queue ?? [];
  const inGameAgents = agents.filter((agent) => agent.status === "in_game" || agent.status === "minted_on_base" || agent.status === "completed");

  if (!state) return <main className="loading">Loading control room...</main>;

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Clan World × Ika</p>
          <h1>Cross-chain agent control room</h1>
          <p className="subtitle">Solana owns the NFT. Ika signs the dWallet action. Base runs the game.</p>
        </div>
        <div className="wallet-live">
          <button onClick={connectPhantom}>{wallet.connected ? "Solana wallet connected" : "Connect Solana wallet"}</button>
          <span>{wallet.address ?? wallet.error ?? "Guided mode works without a wallet."}</span>
        </div>
      </header>

      <section className="controls card">
        <button disabled={!!busy} onClick={() => run("reset", demoApi.reset)}>Reset</button>
        <button disabled={!!busy} onClick={() => run("wallet_a", () => demoApi.connectWallet("wallet_a"))}>Connect Wallet A</button>
        <button disabled={!!busy} onClick={() => run("queue_a", () => demoApi.queue("wallet_a", "agent_001"))}>Queue NFT 1</button>
        <button disabled={!!busy} onClick={() => run("wallet_b", () => demoApi.connectWallet("wallet_b"))}>Switch to Wallet B</button>
        <button disabled={!!busy} onClick={() => run("queue_b", () => demoApi.queue("wallet_b", "agent_002"))}>Queue NFT 2</button>
        <button disabled={!!busy} onClick={() => run("start", demoApi.startGame)}>Start Game</button>
        <button disabled={!!busy} onClick={() => run("transfer", () => demoApi.tryTransfer("agent_001"))}>Try Transfer</button>
        <button disabled={!!busy} onClick={() => run("invalid", () => demoApi.invalidAction("agent_001"))}>Reject Bad Action</button>
        <button disabled={!!busy} onClick={() => run("mint1", () => demoApi.mintOnBase("agent_001"))}>Mint Player 1</button>
        <button disabled={!!busy} onClick={() => run("mint2", () => demoApi.mintOnBase("agent_002"))}>Mint Player 2</button>
        <button disabled={!!busy} onClick={() => run("end", demoApi.endGame)}>End + Thaw</button>
        <button disabled={!!busy} onClick={() => loadLiveStatus().then(setLiveStatus).catch((error) => alert(error.message))}>Check Live RPC</button>
      </section>

      {busy && <div className="busy">Running step: {busy}</div>}

      <LiveStatusPanel status={liveStatus} />

      <section className="grid">
        <WalletLane title="Solana Wallets" agents={agents} />
        <SolanaLane state={state} queuedAgents={queuedAgents} inGameAgents={inGameAgents} />
        <IkaLane state={state} />
        <BaseLane state={state} />
      </section>

      <section className="timeline card">
        <h2>Proof timeline</h2>
        <div className="timeline-list">
          {state.events.map((event) => (
            <article key={event.id} className={`event event-${event.proof?.status ?? "pending"}`}>
              <span>{event.type}</span>
              <strong>{event.title}</strong>
              <p>{event.message}</p>
              {event.proof && <small>{event.proof.network} · {event.proof.label} · {event.proof.status}</small>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function LiveStatusPanel({ status }: { status: { solanaDevnetSlot: number | null; baseSepoliaBlockHex: string | null } | null }) {
  return (
    <section className="live-status card">
      <div><span>Solana devnet slot</span><strong>{status?.solanaDevnetSlot ?? "not checked"}</strong></div>
      <div><span>Base Sepolia block</span><strong>{status?.baseSepoliaBlockHex ? Number.parseInt(status.baseSepoliaBlockHex, 16) : "not checked"}</strong></div>
      <p>These are live RPC reads from the relayer. They prove the demo is pointed at real networks even when guided mode is used for recording.</p>
    </section>
  );
}

function WalletLane({ title, agents }: { title: string; agents: Agent[] }) {
  return (
    <section className="lane card">
      <h2>{title}</h2>
      <div className="wallet-columns">
        {["wallet_a", "wallet_b"].map((walletId) => (
          <div key={walletId} className="wallet-box">
            <h3>{walletId === "wallet_a" ? "Wallet A" : "Wallet B"}</h3>
            {agents.filter((agent) => agent.walletId === walletId).map((agent) => <AgentCard key={agent.nftId} agent={agent} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

function SolanaLane({ state, queuedAgents, inGameAgents }: { state: DemoState; queuedAgents: string[]; inGameAgents: Agent[] }) {
  return (
    <section className="lane card solana">
      <h2>Solana game manager</h2>
      <div className="manager-box">
        <span>Game</span>
        <strong>{state.game.id}</strong>
        <p>Status: {state.game.status}</p>
      </div>
      <h3>Queue</h3>
      <div className="queue-row">{queuedAgents.length ? queuedAgents.map((id) => <Chip key={id} label={id} />) : <em>empty</em>}</div>
      <h3>In game</h3>
      <div className="queue-row">{inGameAgents.length ? inGameAgents.map((agent) => <Chip key={agent.nftId} label={`${agent.nftId} ${agent.isFrozen ? "❄ frozen" : "thawed"}`} />) : <em>none</em>}</div>
    </section>
  );
}

function IkaLane({ state }: { state: DemoState }) {
  const intents = Object.values(state.intents);
  return (
    <section className="lane card ika">
      <h2>Ika signing layer</h2>
      {intents.length === 0 && <p className="muted">No signing requests yet.</p>}
      {intents.map((intent) => (
        <article key={intent.id} className={`intent intent-${intent.status}`}>
          <span>{intent.status}</span>
          <strong>{intent.dWalletId}</strong>
          <p>{intent.functionName} · {intent.nftId}</p>
          {intent.reason && <small>{intent.reason}</small>}
        </article>
      ))}
    </section>
  );
}

function BaseLane({ state }: { state: DemoState }) {
  const minted = Object.values(state.agents).filter((agent) => agent.baseClanMinted);
  return (
    <section className="lane card base">
      <h2>Base Sepolia game</h2>
      <div className="contract-box">
        <span>ClanWorldBaseGame</span>
        <strong>{state.game.baseContractAddress.slice(0, 10)}...</strong>
      </div>
      {minted.length === 0 ? <p className="muted">Waiting for dWallet calls.</p> : minted.map((agent) => (
        <div key={agent.nftId} className="minted">✅ {agent.nftId} minted by {agent.baseAddress?.slice(0, 10)}...</div>
      ))}
    </section>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article className={`agent-card status-${agent.status} ${agent.isFrozen ? "frozen" : ""}`}>
      <div className="agent-art">🧬</div>
      <div>
        <strong>{agent.nftId}</strong>
        <p>{agent.status}</p>
        <small>{agent.isFrozen ? "Frozen in game" : "Transferable"}</small>
      </div>
    </article>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="chip">{label}</span>;
}
