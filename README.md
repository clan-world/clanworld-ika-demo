# Clan World Ika Demo

A pnpm monorepo that demonstrates this flow:

Solana owns the agent NFT. The Solana game manager queues and freezes the NFT while it is in play. Ika signs Base Sepolia transactions for the mapped dWallet. Base receives the agent action from the dWallet, not from a backend-held private key.

## Start here

1. Read the [Run Book](docs/runbook.md).
2. Read the [Architecture](docs/architecture.md).
3. Review the [Roadmap](docs/roadmap.md).
4. Check the [Sources and References](docs/sources.md).

## What is included

- Vite React demo UI with a single animated control-room screen.
- Relayer service with mock and Ika signing adapters.
- Anchor Solana game manager program for queue, freeze, authorize, and thaw.
- Base Sepolia Solidity contract for `mintClan(nftId)` from the dWallet caller.
- Deployment helpers for Solana and Base.
- Low-cost AWS Terraform for static UI hosting plus optional relayer hosting.
- Critical-path tests for queue, freeze, failed transfer, policy rejection, Base mint, and thaw.

## Fast local preview

```sh
corepack enable
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev:relayer
pnpm dev:web
```

Open the UI printed by Vite. Use guided mode first. Then follow the run book to connect devnet and Base Sepolia.

## Project status

This is a demo-ready scaffold. The Base contract and Solana program are real deployable code. Ika Solana support is pre-alpha, so the repo includes a mock signing adapter and an Ika adapter seam. Use mock mode for reliable recording, turn on `LIVE_BASE_RELAY=true` when you want the mock dWallet keys to send real Base Sepolia transactions, then switch to Ika mode when your pre-alpha access and addresses are ready.
