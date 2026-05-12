import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  createTransferInstruction,
  getAccount,
  mintTo
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { clanWorldBaseGameAbi } from "@clanworld/base-sdk";
import { agentStatePda, freezeAuthorityPda, gameManagerPda } from "@clanworld/solana-sdk";
import { createPublicClient, createWalletClient, encodeFunctionData, encodePacked, http, keccak256, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const DEFAULT_PROGRAM_ID = "J9TWXt5regfvpX9RSuBy7xSD1k8VTpRWMtBoMS7W1esw";
const DEFAULT_BASE_CONTRACT = "0x6C34adEc077056512668723D4f90FDb62E6c736b";
const DEFAULT_SOLANA_KEYPAIR = "/home/claude/code/clan-world/sealed-skill-nft-demo/data/solana/backend-keypair.json";
const DEFAULT_GAME_ENV = "/home/claude/code/clan-world/clan-world-game/.env.local";
const PROOF_PATH = "docs/proofs/hackathon-proof.json";

type HexAddress = `0x${string}`;

function loadKeypair(path: string) {
  const resolved = path.replace(/^~/, homedir());
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(resolve(resolved), "utf8"))));
}

function parseEnvFile(path: string) {
  const values = new Map<string, string>();
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (match) values.set(match[1], match[2].replace(/^['"]|['"]$/g, ""));
    }
  } catch {
    // Optional fallback file.
  }
  return values;
}

function anchorDiscriminator(name: string) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function u64(value: bigint | number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function baseAddressBytes(address: string) {
  const clean = address.replace(/^0x/i, "");
  if (clean.length !== 40) throw new Error(`Expected a 20-byte Base address, got ${address}`);
  return Buffer.from(clean, "hex");
}

function gamePda(programId: PublicKey, gameId: bigint) {
  return PublicKey.findProgramAddressSync([Buffer.from("game"), u64(gameId)], programId);
}

function approvalPda(programId: PublicKey, game: PublicKey, agent: PublicKey, nonce: bigint) {
  return PublicKey.findProgramAddressSync([Buffer.from("approval"), game.toBuffer(), agent.toBuffer(), u64(nonce)], programId);
}

function solanaExplorer(signatureOrAddress: string) {
  return `https://explorer.solana.com/address/${signatureOrAddress}?cluster=devnet`;
}

function solanaTx(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function baseTx(hash: string) {
  return `https://sepolia.basescan.org/tx/${hash}`;
}

function baseAddress(address: string) {
  return `https://sepolia.basescan.org/address/${address}`;
}

function easternTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "long"
  }).format(date);
}

function readManager(data: Buffer) {
  return {
    authority: new PublicKey(data.subarray(8, 40)),
    baseContract: `0x${Buffer.from(data.subarray(40, 60)).toString("hex")}` as HexAddress,
    gameCounter: data.readBigUInt64LE(60),
    queueLen: data.readUInt8(68)
  };
}

async function mintNft(connection: Connection, payer: Keypair, owner: PublicKey, freezeAuthority: PublicKey) {
  const mint = await createMint(connection, payer, payer.publicKey, freezeAuthority, 0);
  const tokenAccount = await createAssociatedTokenAccount(connection, payer, mint, owner);
  const mintSignature = await mintTo(connection, payer, mint, tokenAccount, payer, 1);
  return { mint, tokenAccount, mintSignature };
}

async function main() {
  const sourceEnv = parseEnvFile(process.env.SOURCE_DEPLOYER_ENV_PATH ?? DEFAULT_GAME_ENV);
  const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? sourceEnv.get("BASE_SEPOLIA_RPC_URL") ?? "https://sepolia.base.org";
  const deployerPrivateKey = (process.env.DEPLOYER_PRIVATE_KEY ?? sourceEnv.get("DEPLOYER_PRIVATE_KEY")) as HexAddress | undefined;
  if (!deployerPrivateKey?.startsWith("0x")) throw new Error("DEPLOYER_PRIVATE_KEY is required for Base Sepolia funding.");

  const solanaRpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = new PublicKey(process.env.SOLANA_PROGRAM_ID ?? DEFAULT_PROGRAM_ID);
  const baseContract = (process.env.BASE_CLAN_GAME_ADDRESS ?? DEFAULT_BASE_CONTRACT) as HexAddress;
  const payer = loadKeypair(process.env.SOLANA_KEYPAIR_PATH ?? DEFAULT_SOLANA_KEYPAIR);
  const connection = new Connection(solanaRpcUrl, "confirmed");
  const [manager] = gameManagerPda(programId);
  const [freezeAuthority] = freezeAuthorityPda(programId);
  const managerInfo = await connection.getAccountInfo(manager, "confirmed");
  if (!managerInfo) throw new Error(`Game manager ${manager.toBase58()} does not exist.`);
  const managerState = readManager(managerInfo.data);
  if (!managerState.authority.equals(payer.publicKey)) throw new Error("Configured Solana keypair is not the game manager authority.");
  if (managerState.queueLen !== 0) throw new Error(`Game manager queue must be empty for this proof run; found ${managerState.queueLen}.`);
  if (managerState.baseContract.toLowerCase() !== baseContract.toLowerCase()) {
    throw new Error(`Manager allowlists ${managerState.baseContract}, but BASE_CLAN_GAME_ADDRESS is ${baseContract}.`);
  }

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(baseSepoliaRpcUrl) });
  const deployer = privateKeyToAccount(deployerPrivateKey);
  const deployerWallet = createWalletClient({ account: deployer, chain: baseSepolia, transport: http(baseSepoliaRpcUrl) });
  const dWallets = [privateKeyToAccount(`0x${randomBytes(32).toString("hex")}`), privateKeyToAccount(`0x${randomBytes(32).toString("hex")}`)];
  const nftBase = BigInt(Math.floor(Date.now() / 1000));
  const nftIds = [nftBase, nftBase + 1n];

  console.log(`Solana authority: ${payer.publicKey.toBase58()}`);
  console.log(`Program: ${programId.toBase58()}`);
  console.log(`Manager: ${manager.toBase58()}`);
  console.log(`Base contract: ${baseContract}`);
  console.log(`Funding proof dWallets from deployer ${deployer.address}`);

  const funding = [];
  for (const wallet of dWallets) {
    const hash = await deployerWallet.sendTransaction({ to: wallet.address, value: parseEther("0.0015") });
    await publicClient.waitForTransactionReceipt({ hash });
    funding.push({ to: wallet.address, hash });
  }

  const recipient = Keypair.generate();
  const agents = [];
  for (let index = 0; index < 2; index += 1) {
    const minted = await mintNft(connection, payer, payer.publicKey, freezeAuthority);
    const transferTarget = await createAssociatedTokenAccount(connection, payer, minted.mint, recipient.publicKey);
    const [agent] = agentStatePda(programId, minted.mint);
    agents.push({
      nftId: nftIds[index],
      mint: minted.mint,
      tokenAccount: minted.tokenAccount,
      transferTarget,
      agent,
      dWallet: dWallets[index],
      mintSignature: minted.mintSignature
    });
  }

  const queueSignatures = [];
  for (const agent of agents) {
    const data = Buffer.concat([
      anchorDiscriminator("queue_agent"),
      u64(agent.nftId),
      randomBytes(32),
      baseAddressBytes(agent.dWallet.address)
    ]);
    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: manager, isSigner: false, isWritable: true },
        { pubkey: agent.agent, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: agent.mint, isSigner: false, isWritable: false },
        { pubkey: agent.tokenAccount, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer], { commitment: "confirmed" });
    queueSignatures.push(signature);
  }

  const gameId = BigInt(Date.now());
  const [game] = gamePda(programId, gameId);
  const startData = Buffer.concat([anchorDiscriminator("start_game"), u64(gameId)]);
  const startSignature = await sendAndConfirmTransaction(connection, new Transaction().add(new TransactionInstruction({
    programId,
    keys: [
      { pubkey: manager, isSigner: false, isWritable: true },
      { pubkey: game, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: agents[0].agent, isSigner: false, isWritable: true },
      { pubkey: agents[1].agent, isSigner: false, isWritable: true },
      { pubkey: agents[0].tokenAccount, isSigner: false, isWritable: true },
      { pubkey: agents[1].tokenAccount, isSigner: false, isWritable: true },
      { pubkey: agents[0].mint, isSigner: false, isWritable: true },
      { pubkey: agents[1].mint, isSigner: false, isWritable: true },
      { pubkey: freezeAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: startData
  })), [payer], { commitment: "confirmed" });

  const frozenStates = await Promise.all(agents.map((agent) => getAccount(connection, agent.tokenAccount)));
  if (!frozenStates.every((account) => account.isFrozen)) throw new Error("Expected both token accounts to be frozen after start_game.");

  let blockedTransferError = "";
  try {
    const transferIx = createTransferInstruction(agents[0].tokenAccount, agents[0].transferTarget, payer.publicKey, 1);
    await sendAndConfirmTransaction(connection, new Transaction().add(transferIx), [payer], { commitment: "confirmed" });
    throw new Error("Unexpectedly transferred a frozen NFT.");
  } catch (error) {
    blockedTransferError = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
  }

  const approvals = [];
  const baseMints = [];
  for (let index = 0; index < agents.length; index += 1) {
    const agent = agents[index];
    const nonce = BigInt(index + 1);
    const [approval] = approvalPda(programId, game, agent.agent, nonce);
    const calldata = encodeFunctionData({ abi: clanWorldBaseGameAbi, functionName: "mintClan", args: [agent.nftId] });
    const txDigest = keccak256(encodePacked(["address", "bytes", "uint256"], [baseContract, calldata, nonce]));
    const approvalData = Buffer.concat([
      anchorDiscriminator("approve_base_action"),
      Buffer.from(txDigest.slice(2), "hex"),
      u64(nonce),
      baseAddressBytes(baseContract)
    ]);
    const signature = await sendAndConfirmTransaction(connection, new Transaction().add(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: manager, isSigner: false, isWritable: false },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: game, isSigner: false, isWritable: false },
        { pubkey: agent.agent, isSigner: false, isWritable: false },
        { pubkey: approval, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: approvalData
    })), [payer], { commitment: "confirmed" });
    approvals.push({ signature, approval: approval.toBase58(), txDigest });

    const wallet = createWalletClient({ account: agent.dWallet, chain: baseSepolia, transport: http(baseSepoliaRpcUrl) });
    const hash = await wallet.writeContract({
      address: baseContract,
      abi: clanWorldBaseGameAbi,
      functionName: "mintClan",
      args: [agent.nftId]
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Base mint reverted: ${hash}`);
    const recordedWallet = await publicClient.readContract({
      address: baseContract,
      abi: clanWorldBaseGameAbi,
      functionName: "walletByNftId",
      args: [agent.nftId],
      blockNumber: receipt.blockNumber
    });
    baseMints.push({ hash, recordedWallet });
  }

  const endSignature = await sendAndConfirmTransaction(connection, new Transaction().add(new TransactionInstruction({
    programId,
    keys: [
      { pubkey: manager, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: game, isSigner: false, isWritable: true },
      { pubkey: agents[0].agent, isSigner: false, isWritable: true },
      { pubkey: agents[1].agent, isSigner: false, isWritable: true },
      { pubkey: agents[0].tokenAccount, isSigner: false, isWritable: true },
      { pubkey: agents[1].tokenAccount, isSigner: false, isWritable: true },
      { pubkey: agents[0].mint, isSigner: false, isWritable: true },
      { pubkey: agents[1].mint, isSigner: false, isWritable: true },
      { pubkey: freezeAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: anchorDiscriminator("end_game")
  })), [payer], { commitment: "confirmed" });

  const thawedStates = await Promise.all(agents.map((agent) => getAccount(connection, agent.tokenAccount)));
  if (!thawedStates.every((account) => !account.isFrozen)) throw new Error("Expected both token accounts to be thawed after end_game.");

  const latestManagerInfo = await connection.getAccountInfo(manager, "confirmed");
  const latestManager = latestManagerInfo ? readManager(latestManagerInfo.data) : managerState;
  const proof = {
    generatedAtEastern: easternTimestamp(),
    generatedAtIso: new Date().toISOString(),
    truthInAdvertising: "Real Solana devnet and Base Sepolia transactions. Base transactions are signed by fresh mock dWallet private keys because this repo's public Ika path is mock-backed.",
    networks: {
      solana: { cluster: "devnet", rpcUrl: solanaRpcUrl },
      base: { chain: "Base Sepolia", chainId: 84532, rpcUrl: baseSepoliaRpcUrl }
    },
    solana: {
      programId: programId.toBase58(),
      manager: manager.toBase58(),
      freezeAuthority: freezeAuthority.toBase58(),
      authority: payer.publicKey.toBase58(),
      gameId: gameId.toString(),
      game: game.toBase58(),
      managerGameCounterAfterRun: latestManager.gameCounter.toString(),
      queueLenAfterRun: latestManager.queueLen,
      blockedTransferError,
      startSignature,
      endSignature
    },
    base: {
      contract: baseContract,
      deployer: deployer.address,
      dWalletFunding: funding
    },
    agents: agents.map((agent, index) => ({
      label: `Agent ${index + 1}`,
      nftId: agent.nftId.toString(),
      mint: agent.mint.toBase58(),
      tokenAccount: agent.tokenAccount.toBase58(),
      agentState: agent.agent.toBase58(),
      mockDWalletBaseAddress: agent.dWallet.address,
      mintSignature: agent.mintSignature,
      queueSignature: queueSignatures[index],
      approvalSignature: approvals[index].signature,
      approvalAccount: approvals[index].approval,
      txDigest: approvals[index].txDigest,
      baseMintHash: baseMints[index].hash,
      baseRecordedWallet: baseMints[index].recordedWallet
    })),
    explorerLinks: {
      solanaProgram: solanaExplorer(programId.toBase58()),
      solanaManager: solanaExplorer(manager.toBase58()),
      solanaGame: solanaExplorer(game.toBase58()),
      startGame: solanaTx(startSignature),
      endGame: solanaTx(endSignature),
      baseContract: baseAddress(baseContract),
      agents: agents.map((agent, index) => ({
        mint: solanaExplorer(agent.mint.toBase58()),
        tokenAccount: solanaExplorer(agent.tokenAccount.toBase58()),
        queue: solanaTx(queueSignatures[index]),
        approval: solanaTx(approvals[index].signature),
        baseMint: baseTx(baseMints[index].hash)
      }))
    }
  };

  mkdirSync(dirname(PROOF_PATH), { recursive: true });
  writeFileSync(PROOF_PATH, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`Wrote ${PROOF_PATH}`);
  console.log(`Start game: ${startSignature}`);
  console.log(`End game: ${endSignature}`);
  for (const agent of proof.agents) console.log(`${agent.label}: nftId=${agent.nftId} mint=${agent.mint} baseTx=${agent.baseMintHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
