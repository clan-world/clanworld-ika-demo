import { createPublicClient, createWalletClient, encodeFunctionData, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { clanWorldBaseGameAbi } from "./abi.ts";

export { clanWorldBaseGameAbi };

export function createBasePublicClient(rpcUrl: string) {
  return createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
}

export function encodeMintClan(nftId: string | number | bigint): Hex {
  const numeric = BigInt(String(nftId).replace(/\D/g, "") || "0");
  return encodeFunctionData({ abi: clanWorldBaseGameAbi, functionName: "mintClan", args: [numeric] });
}

export async function readWalletByNftId(options: { rpcUrl: string; contractAddress: `0x${string}`; nftId: string | number | bigint }) {
  const client = createBasePublicClient(options.rpcUrl);
  const numeric = BigInt(String(options.nftId).replace(/\D/g, "") || "0");
  return client.readContract({
    address: options.contractAddress,
    abi: clanWorldBaseGameAbi,
    functionName: "walletByNftId",
    args: [numeric]
  });
}


export async function mintClanWithPrivateKey(options: {
  rpcUrl: string;
  privateKey: `0x${string}`;
  contractAddress: `0x${string}`;
  nftId: string | number | bigint;
}) {
  const account = privateKeyToAccount(options.privateKey);
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(options.rpcUrl) });
  const publicClient = createBasePublicClient(options.rpcUrl);
  const numeric = BigInt(String(options.nftId).replace(/\D/g, "") || "0");
  const hash = await wallet.writeContract({
    address: options.contractAddress,
    abi: clanWorldBaseGameAbi,
    functionName: "mintClan",
    args: [numeric]
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function relaySignedBaseTransaction(options: { rpcUrl: string; signedTransaction: `0x${string}` }) {
  const client = createBasePublicClient(options.rpcUrl);
  return client.sendRawTransaction({ serializedTransaction: options.signedTransaction });
}
