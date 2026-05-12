import { PublicKey } from "@solana/web3.js";

const text = (value: string) => new TextEncoder().encode(value);

export function gameManagerPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([text("game-manager")], programId);
}

export function freezeAuthorityPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([text("freeze-authority")], programId);
}

export function agentStatePda(programId: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync([text("agent"), mint.toBytes()], programId);
}

export function gamePda(programId: PublicKey, gameId: string) {
  return PublicKey.findProgramAddressSync([text("game"), text(gameId)], programId);
}
