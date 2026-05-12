import "dotenv/config";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { freezeAuthorityPda } from "@clanworld/solana-sdk";

function loadKeypair(path = "~/.config/solana/id.json") {
  const resolved = path.replace("~", homedir());
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(resolve(resolved), "utf8"))));
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = new PublicKey(process.env.SOLANA_PROGRAM_ID ?? "5vuLEQSXc7mwGWB7outYr36LyaPZU111Nrx4srpMhDSK");
  const connection = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair(process.env.SOLANA_KEYPAIR_PATH);
  const [freezeAuthority] = freezeAuthorityPda(programId);

  const walletA = payer.publicKey;
  const walletB = process.env.SOLANA_WALLET_B ? new PublicKey(process.env.SOLANA_WALLET_B) : payer.publicKey;
  const owners = [walletA, walletB, walletB];
  const mints: string[] = [];

  for (const [index, owner] of owners.entries()) {
    const mint = await createMint(connection, payer, payer.publicKey, freezeAuthority, 0);
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner);
    await mintTo(connection, payer, mint, ata.address, payer, 1);
    mints.push(mint.toBase58());
    console.log(`Agent ${index + 1}: mint=${mint.toBase58()} owner=${owner.toBase58()} tokenAccount=${ata.address.toBase58()}`);
  }

  console.log("Add this to .env:");
  console.log(`SOLANA_DEMO_NFT_MINTS=${mints.join(",")}`);
  console.log(`SOLANA_FREEZE_AUTHORITY_PDA=${freezeAuthority.toBase58()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
