import { getAccount } from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";

export async function isTokenAccountFrozen(connection: Connection, tokenAccount: PublicKey): Promise<boolean> {
  const account = await getAccount(connection, tokenAccount);
  return account.isFrozen;
}
