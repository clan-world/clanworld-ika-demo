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

## Deployed hackathon PoC

Hosted demo:

```txt
https://ika.clan-world.com/
```

Current deployed network anchors:

```txt
Base Sepolia ClanWorldBaseGame
0x6C34adEc077056512668723D4f90FDb62E6c736b

Solana devnet game manager program
J9TWXt5regfvpX9RSuBy7xSD1k8VTpRWMtBoMS7W1esw

Solana devnet game manager PDA
DXmBfQsjzBmNYFSFMeR5zSVVHW4haPFmA4J1w7JQcni7

Solana devnet freeze-authority PDA
2GxLCmVVK9HQx1V5CwM11zAZ3XkeKdTgD7PpuNsPhCUR
```

Demo SPL NFT fixtures on Solana devnet, each minted with amount `1`, decimals `0`, and freeze authority set to the game manager freeze PDA:

```txt
Agent 1 mint
4TFrXcBV1d9K8YUN9uMmJtwEGaKVjLnV4gU3EjLfHbCU

Agent 2 mint
FFgGpaZw6mAtHVm35V5s2Prv2L7PcNUJZJCap4NgU7Y7

Agent 3 mint
2zNe2xcfKrafomrB1M1kRDVQomeLkzGm2yAV9XyLkaxx
```

The hosted relayer is currently configured for reliable judging and recording:

```txt
SIGNING_ADAPTER=mock
LIVE_BASE_RELAY=false
```

That means the public demo uses the real deployed Solana/Base anchors for status and proof context, while the button-by-button guided flow remains reusable and does not spend gas on every run. The Ika adapter path is present in `packages/signing-adapter` and `packages/ika-sdk`; wiring it to Ika Solana pre-alpha gRPC is the next integration step. Ika's public Solana pre-alpha materials currently describe pre-alpha signing as mock-backed rather than production distributed MPC.

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
