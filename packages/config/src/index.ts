export type AppConfig = {
  demoApiUrl: string;
  port: number;
  solanaRpcUrl: string;
  solanaProgramId: string;
  baseSepoliaRpcUrl: string;
  baseChainId: number;
  baseClanGameAddress: string;
  signingAdapter: "mock" | "ika";
  mockDWalletPrivateKeys: string[];
  dWalletBaseAddresses: string[];
  liveBaseRelay: boolean;
  ikaEnabled: boolean;
  ikaPreAlphaEndpoint: string | undefined;
  ikaProgramId: string | undefined;
};

type EnvMap = Record<string, string | undefined>;
const runtimeEnv = (): EnvMap => ((globalThis as { process?: { env?: EnvMap } }).process?.env ?? {});
const read = (name: string, fallback = "") => runtimeEnv()[name] ?? fallback;

export function loadConfig(env: EnvMap = runtimeEnv()): AppConfig {
  const get = (name: string, fallback = "") => env[name] ?? fallback;
  return {
    demoApiUrl: get("DEMO_API_URL", "http://localhost:8787"),
    port: Number(get("PORT", "8787")),
    solanaRpcUrl: get("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
    solanaProgramId: get("SOLANA_PROGRAM_ID", "ReplaceWithDeployedProgramId"),
    baseSepoliaRpcUrl: get("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
    baseChainId: Number(get("BASE_CHAIN_ID", "84532")),
    baseClanGameAddress: get("BASE_CLAN_GAME_ADDRESS", "0x1111111111111111111111111111111111111111"),
    signingAdapter: get("SIGNING_ADAPTER", "mock") === "ika" ? "ika" : "mock",
    mockDWalletPrivateKeys: get("MOCK_DWALLET_PRIVATE_KEYS", "").split(",").map((x: string) => x.trim()).filter(Boolean),
    dWalletBaseAddresses: get("IKA_DWALLET_BASE_ADDRESSES", "").split(",").map((x: string) => x.trim()).filter(Boolean),
    liveBaseRelay: get("LIVE_BASE_RELAY", "false") === "true",
    ikaEnabled: get("IKA_ENABLED", "false") === "true",
    ikaPreAlphaEndpoint: get("IKA_PRE_ALPHA_ENDPOINT") || undefined,
    ikaProgramId: get("IKA_PROGRAM_ID") || undefined
  };
}

export function publicConfig() {
  return {
    demoApiUrl: read("DEMO_API_URL", "http://localhost:8787"),
    solanaRpcUrl: read("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
    baseChainId: Number(read("BASE_CHAIN_ID", "84532")),
    baseClanGameAddress: read("BASE_CLAN_GAME_ADDRESS", "0x1111111111111111111111111111111111111111")
  };
}
