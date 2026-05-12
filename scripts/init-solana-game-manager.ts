import "dotenv/config";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { gameManagerPda, freezeAuthorityPda } from "@clanworld/solana-sdk";

function loadKeypair(path = "~/.config/solana/id.json") {
  const resolved = path.replace("~", homedir());
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(resolve(resolved), "utf8"))));
}

function hex20(address: string): number[] {
  const clean = address.replace(/^0x/, "");
  if (clean.length !== 40) throw new Error("BASE_CLAN_GAME_ADDRESS must be a 20-byte hex address.");
  return Array.from(Buffer.from(clean, "hex"));
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = new PublicKey(process.env.SOLANA_PROGRAM_ID ?? "5vuLEQSXc7mwGWB7outYr36LyaPZU111Nrx4srpMhDSK");
  const payer = loadKeypair(process.env.SOLANA_KEYPAIR_PATH);
  const connection = new Connection(rpcUrl, "confirmed");
  const [manager] = gameManagerPda(programId);
  const [freezeAuthority] = freezeAuthorityPda(programId);
  const baseContract = hex20(process.env.BASE_CLAN_GAME_ADDRESS ?? "0x1111111111111111111111111111111111111111");

  console.log("This helper prints the values needed for Anchor initialization.");
  console.log(`RPC: ${connection.rpcEndpoint}`);
  console.log(`Payer: ${payer.publicKey.toBase58()}`);
  console.log(`Program: ${programId.toBase58()}`);
  console.log(`Game manager PDA: ${manager.toBase58()}`);
  console.log(`Freeze authority PDA: ${freezeAuthority.toBase58()}`);
  console.log(`Base contract bytes: [${baseContract.join(",")}]`);
  console.log("Use Anchor TS client or the generated IDL to call initialize(authority, baseContract).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
