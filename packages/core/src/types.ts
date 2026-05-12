export type AgentStatus =
  | "idle"
  | "queued"
  | "in_game"
  | "minted_on_base"
  | "completed";

export type SigningStatus = "pending" | "approved" | "rejected" | "signed" | "relayed" | "confirmed";

export type NetworkName = "solana-devnet" | "base-sepolia" | "ika-pre-alpha" | "local";

export type Proof = {
  network: NetworkName;
  label: string;
  hash?: string;
  href?: string;
  status: "pending" | "success" | "failed" | "rejected";
};

export type Agent = {
  nftId: string;
  nftMint: string;
  walletId: string;
  ownerAddress: string;
  status: AgentStatus;
  isFrozen: boolean;
  queuePosition?: number;
  gameId?: string;
  slot?: number;
  dWalletId?: string;
  baseAddress?: string;
  baseClanMinted?: boolean;
};

export type Game = {
  id: string;
  status: "idle" | "forming" | "active" | "ended";
  selectedNftIds: string[];
  baseContractAddress: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
};

export type BaseActionIntent = {
  id: string;
  gameId: string;
  nftId: string;
  dWalletId: string;
  baseAddress: string;
  baseContractAddress: string;
  functionName: "mintClan";
  chainId: number;
  nonce: number;
  calldataDigest: string;
  status: SigningStatus;
  reason?: string;
  txHash?: string;
};

export type DemoEventType =
  | "wallet.connected"
  | "nft.queued"
  | "game.started"
  | "nft.frozen"
  | "transfer.failed"
  | "transfer.succeeded"
  | "base.intent.created"
  | "base.intent.rejected"
  | "base.intent.approved"
  | "ika.signature.requested"
  | "ika.signature.completed"
  | "base.tx.relayed"
  | "base.tx.confirmed"
  | "game.ended"
  | "nft.thawed";

export type DemoEvent = {
  id: string;
  type: DemoEventType;
  title: string;
  message: string;
  createdAt: string;
  proof?: Proof;
  agentNftId?: string;
  gameId?: string;
};

export type DemoState = {
  wallets: Record<string, { id: string; label: string; address: string; connected: boolean }>;
  agents: Record<string, Agent>;
  queue: string[];
  game: Game;
  intents: Record<string, BaseActionIntent>;
  events: DemoEvent[];
};

export type DemoConfig = {
  baseContractAddress: string;
  allowedFunctionNames: readonly string[];
  chainId: number;
};
