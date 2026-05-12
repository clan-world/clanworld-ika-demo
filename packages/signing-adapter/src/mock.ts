import { privateKeyToAccount } from "viem/accounts";
import type { SignBaseTransactionRequest, SignedBaseTransaction, SigningAdapter } from "./types.ts";

export class MockSigningAdapter implements SigningAdapter {
  readonly name = "mock" as const;
  private readonly privateKeys: `0x${string}`[];

  constructor(privateKeys: string[]) {
    this.privateKeys = privateKeys.filter(Boolean).map((key) => key as `0x${string}`);
  }

  async signBaseTransaction(request: SignBaseTransactionRequest): Promise<SignedBaseTransaction> {
    const account = this.pickAccount(request.intent.baseAddress);

    // This is intentionally a demo signature string. Real Base transaction signing happens
    // in packages/base-sdk once gas, nonce, and chain data are known.
    const payload = `${request.intent.id}:${request.intent.calldataDigest}:${request.to}:${request.data}`;
    const signature = await account.signMessage({ message: payload });

    return {
      intentId: request.intent.id,
      signerAddress: account.address,
      signedTransaction: signature as `0x${string}`,
      adapter: "mock",
      proofLabel: "mock_signature_for_recording"
    };
  }

  private pickAccount(expectedBaseAddress: string) {
    if (this.privateKeys.length === 0) {
      throw new Error("MOCK_DWALLET_PRIVATE_KEYS is empty. Add at least one private key in .env.");
    }
    const accounts = this.privateKeys.map((key) => privateKeyToAccount(key));
    const matching = accounts.find((account) => account.address.toLowerCase() === expectedBaseAddress.toLowerCase());
    return matching ?? accounts[0]!;
  }
}
