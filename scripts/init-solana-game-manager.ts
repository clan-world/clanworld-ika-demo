import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
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

function anchorDiscriminator(name: string) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = new PublicKey(process.env.SOLANA_PROGRAM_ID ?? "J9TWXt5regfvpX9RSuBy7xSD1k8VTpRWMtBoMS7W1esw");
  const payer = loadKeypair(process.env.SOLANA_KEYPAIR_PATH);
  const connection = new Connection(rpcUrl, "confirmed");
  const [manager] = gameManagerPda(programId);
  const [freezeAuthority] = freezeAuthorityPda(programId);
  const baseContract = hex20(process.env.BASE_CLAN_GAME_ADDRESS ?? "0x1111111111111111111111111111111111111111");
  const existing = await connection.getAccountInfo(manager);

  console.log(`RPC: ${connection.rpcEndpoint}`);
  console.log(`Payer: ${payer.publicKey.toBase58()}`);
  console.log(`Program: ${programId.toBase58()}`);
  console.log(`Game manager PDA: ${manager.toBase58()}`);
  console.log(`Freeze authority PDA: ${freezeAuthority.toBase58()}`);
  console.log(`Base contract bytes: [${baseContract.join(",")}]`);

  if (existing) {
    console.log("Game manager PDA already exists; initialization skipped.");
    return;
  }

  const data = Buffer.concat([
    anchorDiscriminator("initialize"),
    payer.publicKey.toBuffer(),
    Buffer.from(baseContract)
  ]);
  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: manager, isSigner: false, isWritable: true },
      { pubkey: freezeAuthority, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
  const signature = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer], { commitment: "confirmed" });
  console.log(`Initialized game manager: ${signature}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
