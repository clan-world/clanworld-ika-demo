import type { BaseActionIntent } from "@clanworld/core";

export type SignBaseTransactionRequest = {
  intent: BaseActionIntent;
  rawTransaction?: string;
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
  gas?: bigint;
};

export type SignedBaseTransaction = {
  intentId: string;
  signerAddress: `0x${string}`;
  signedTransaction: `0x${string}`;
  adapter: "mock" | "ika";
  proofLabel: string;
};

export interface SigningAdapter {
  readonly name: "mock" | "ika";
  signBaseTransaction(request: SignBaseTransactionRequest): Promise<SignedBaseTransaction>;
}
