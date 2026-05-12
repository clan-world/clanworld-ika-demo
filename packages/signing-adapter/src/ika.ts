import { IkaPreAlphaClient } from "@clanworld/ika-sdk";
import type { SignBaseTransactionRequest, SignedBaseTransaction, SigningAdapter } from "./types.ts";

export class IkaSigningAdapter implements SigningAdapter {
  readonly name = "ika" as const;
  private readonly client: IkaPreAlphaClient;

  constructor(options: { endpoint: string | undefined; programId: string | undefined }) {
    this.client = new IkaPreAlphaClient(options);
  }

  async signBaseTransaction(request: SignBaseTransactionRequest): Promise<SignedBaseTransaction> {
    const response = await this.client.signBaseTransaction({
      dWalletId: request.intent.dWalletId,
      baseAddress: request.intent.baseAddress,
      txDigest: request.intent.calldataDigest,
      rawTransaction: request.rawTransaction,
      metadata: {
        gameId: request.intent.gameId,
        nftId: request.intent.nftId,
        functionName: request.intent.functionName
      }
    });

    return {
      intentId: request.intent.id,
      signerAddress: response.signerAddress as `0x${string}`,
      signedTransaction: response.signedTransaction as `0x${string}`,
      adapter: "ika",
      proofLabel: response.proofLabel
    };
  }
}
