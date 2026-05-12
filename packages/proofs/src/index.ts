export function solanaExplorerTx(txHash: string, cluster = "devnet") {
  return `https://explorer.solana.com/tx/${txHash}?cluster=${cluster}`;
}

export function solanaExplorerAccount(account: string, cluster = "devnet") {
  return `https://explorer.solana.com/address/${account}?cluster=${cluster}`;
}

export function baseSepoliaTx(txHash: string) {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

export function baseSepoliaAddress(address: string) {
  return `https://sepolia.basescan.org/address/${address}`;
}

export type ProofCard = {
  title: string;
  network: "Solana devnet" | "Base Sepolia" | "Ika pre-alpha";
  status: "pending" | "success" | "failed" | "rejected";
  href?: string;
};
