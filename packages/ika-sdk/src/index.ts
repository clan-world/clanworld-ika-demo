export type IkaSignRequest = {
  dWalletId: string;
  baseAddress: string;
  txDigest: string;
  rawTransaction: string | undefined;
  metadata: Record<string, string>;
};

export type IkaSignResponse = {
  signerAddress: string;
  signedTransaction: string;
  proofLabel: string;
};

export class IkaPreAlphaClient {
  private readonly endpoint: string | undefined;
  private readonly programId: string | undefined;

  constructor(options: { endpoint: string | undefined; programId: string | undefined }) {
    this.endpoint = options.endpoint;
    this.programId = options.programId;
  }

  async signBaseTransaction(request: IkaSignRequest): Promise<IkaSignResponse> {
    if (!this.endpoint || !this.programId) {
      throw new Error("Ika adapter selected, but IKA_PRE_ALPHA_ENDPOINT or IKA_PROGRAM_ID is missing.");
    }

    // The Ika Solana pre-alpha SDK is intentionally isolated here because the public API
    // may change. Wire the official client in this file only.
    // Expected production shape:
    // 1. Create/read dWallet.
    // 2. Ask the Solana program to approve the exact message hash.
    // 3. Ask Ika to complete the signature.
    // 4. Read the signature from the approval account.
    const body = JSON.stringify({ ...request, programId: this.programId });
    const response = await fetch(`${this.endpoint.replace(/\/$/, "")}/sign-base-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ika signing failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as Partial<IkaSignResponse>;
    if (!data.signerAddress || !data.signedTransaction) {
      throw new Error("Ika signing response is missing signerAddress or signedTransaction.");
    }

    return {
      signerAddress: data.signerAddress,
      signedTransaction: data.signedTransaction,
      proofLabel: data.proofLabel ?? "ika_pre_alpha_signature"
    };
  }
}
