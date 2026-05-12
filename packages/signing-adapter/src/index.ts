export * from "./types.ts";
export * from "./mock.ts";
export * from "./ika.ts";

import type { AppConfig } from "@clanworld/config";
import { IkaSigningAdapter } from "./ika.ts";
import { MockSigningAdapter } from "./mock.ts";
import type { SigningAdapter } from "./types.ts";

export function createSigningAdapter(config: AppConfig): SigningAdapter {
  if (config.signingAdapter === "ika") {
    return new IkaSigningAdapter({ endpoint: config.ikaPreAlphaEndpoint, programId: config.ikaProgramId });
  }
  return new MockSigningAdapter(config.mockDWalletPrivateKeys);
}
