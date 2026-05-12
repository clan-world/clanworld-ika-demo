import type { DemoState } from "@clanworld/core";

const API_URL = import.meta.env.VITE_DEMO_API_URL ?? "http://localhost:8787";

async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export async function loadState(): Promise<DemoState> {
  const response = await fetch(`${API_URL}/api/demo/state`);
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<DemoState>;
}

export async function loadLiveStatus(): Promise<{ solanaDevnetSlot: number | null; baseSepoliaBlockHex: string | null }> {
  const response = await fetch(`${API_URL}/api/live/status`);
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ solanaDevnetSlot: number | null; baseSepoliaBlockHex: string | null }>;
}

export const demoApi = {
  reset: () => post<DemoState>("/api/demo/reset"),
  connectWallet: (walletId: string) => post<DemoState>("/api/demo/connect-wallet", { walletId }),
  queue: (walletId: string, nftId: string) => post<DemoState>("/api/demo/queue", { walletId, nftId }),
  startGame: () => post<DemoState>("/api/demo/start-game"),
  tryTransfer: (nftId: string) => post<{ succeeded: boolean; state: DemoState }>("/api/demo/try-transfer", { nftId }),
  invalidAction: (nftId: string) => post<{ state: DemoState }>("/api/demo/invalid-action", { nftId }),
  mintOnBase: (nftId: string) => post<{ state: DemoState }>("/api/demo/mint-on-base", { nftId }),
  endGame: () => post<DemoState>("/api/demo/end-game")
};

export function subscribe(onState: (state: DemoState) => void) {
  const events = new EventSource(`${API_URL}/api/events`);
  events.onmessage = (event) => {
    const parsed = JSON.parse(event.data) as { state: DemoState };
    onState(parsed.state);
  };
  return () => events.close();
}
