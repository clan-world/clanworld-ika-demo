# Clan World Ika Demo

Cross-chain agent custody proof for the Ika hackathon: Solana owns and freezes the agent NFT, the game manager approves the action, and Base Sepolia receives the agent action from the mapped dWallet address.

<video src="docs/assets/clanworld-ika-demo-flow.webm" controls muted playsinline width="100%"></video>

[Watch the recorded mock-mode flow](docs/assets/clanworld-ika-demo-flow.webm) or open the live demo:

```txt
https://ika.clan-world.com/
```

## What Works

- Guided web demo: queue two agents, freeze them in-game, reject a bad action, mint on Base, then thaw.
- Real Solana devnet program: queues NFT agents, freezes SPL token accounts, approves Base actions, and thaws at game end.
- Real Base Sepolia contract: `mintClan(nftId)` records the caller wallet for each NFT ID.
- Real manual proof run: fresh NFTs were minted, queued, frozen, approved, sent to Base, and thawed.
- Mock dWallet signing: the current public Ika Solana pre-alpha path is mock-backed, so Base proof transactions are signed by fresh local mock dWallet keys. The code keeps this isolated behind the signing adapter.

## Live Proof

Manual run completed May 12, 2026, 7:45:20 AM EDT. Full machine-readable proof is in [docs/proofs/hackathon-proof.json](docs/proofs/hackathon-proof.json).

| Item | Value |
| --- | --- |
| Hosted app | <https://ika.clan-world.com/> |
| Base Sepolia `ClanWorldBaseGame` | [`0x6C34adEc077056512668723D4f90FDb62E6c736b`](https://sepolia.basescan.org/address/0x6C34adEc077056512668723D4f90FDb62E6c736b) |
| Solana devnet program | [`J9TWXt5regfvpX9RSuBy7xSD1k8VTpRWMtBoMS7W1esw`](https://explorer.solana.com/address/J9TWXt5regfvpX9RSuBy7xSD1k8VTpRWMtBoMS7W1esw?cluster=devnet) |
| Game manager PDA | [`DXmBfQsjzBmNYFSFMeR5zSVVHW4haPFmA4J1w7JQcni7`](https://explorer.solana.com/address/DXmBfQsjzBmNYFSFMeR5zSVVHW4haPFmA4J1w7JQcni7?cluster=devnet) |
| Freeze authority PDA | `2GxLCmVVK9HQx1V5CwM11zAZ3XkeKdTgD7PpuNsPhCUR` |
| Proof game PDA | [`Bhy4ftwYt2Gft2GQBfGQASZnm7jnt8r9JhVfftXv5nuZ`](https://explorer.solana.com/address/Bhy4ftwYt2Gft2GQBfGQASZnm7jnt8r9JhVfftXv5nuZ?cluster=devnet) |
| Start/freeze tx | [`5e9cfx...Kvavw`](https://explorer.solana.com/tx/5e9cfxnr3cREEco5q4264Daad4moMmR29ve8pHXRJi3NsaZ6b6Zx3xRrsqjdSwN74m6W7oEk8qwMReWG6a9Kvavw?cluster=devnet) |
| End/thaw tx | [`4okb2Q...ebVo`](https://explorer.solana.com/tx/4okb2QB3Gmx8s47CbrKfnecL5Ea1sk52sWYFmDLBqexG6vS4H1dhoaRTUmcgBPLYuPt4B2uAzrzLMVUaX4QWebVo?cluster=devnet) |

| Agent | Solana NFT | Queue tx | Approval tx | Base mint tx | Mock dWallet caller |
| --- | --- | --- | --- | --- | --- |
| Agent 1, NFT `1778586307` | [`9CgXJy...Dm4P`](https://explorer.solana.com/address/9CgXJy2iwFT8TJtnkvpicbLd3QAfqGiq4i2csE4yDm4P?cluster=devnet) | [`3QscN1...XP1w`](https://explorer.solana.com/tx/3QscN1bEi3TXHsqzPDecnYLWPvu2FKPEZqKv6HtZA9fCBVp8MpfpwJ6H1E2MdEZ7jDRc8dVAREkaBXaD8R2YXP1w?cluster=devnet) | [`2u1mCC...mtak`](https://explorer.solana.com/tx/2u1mCCX1LYT82WE7ALgqF5UuccHZjH2hsErQXbcG38gTLCRnjgRYU1qhBRf7FM4divbRYjZ3aK4PWiYrdp9Smtak?cluster=devnet) | [`0x219a...b9af`](https://sepolia.basescan.org/tx/0x219aa27de7e7181f80f849af40405d1b9b80a38267a2a042c84e4bdc0da3b9af) | [`0x4c7C...BF0c`](https://sepolia.basescan.org/address/0x4c7C7AeD507651eC2b0fe91Df54c9C994bBCBF0c) |
| Agent 2, NFT `1778586308` | [`HxZcjn...7CFe`](https://explorer.solana.com/address/HxZcjnLdA5xhh3uZdxGN2H8kvHp7sfcCs6E3kkgA7CFe?cluster=devnet) | [`2QaNgA...bC53`](https://explorer.solana.com/tx/2QaNgA5bgL6hJcKffAqWkfb5CZm2bYVeTe7JwozyUeVcDwxwi4xbr6fgwXS6aGaCobtHsW3tQ2WNW6FKTHdDbC53?cluster=devnet) | [`4WSZVA...pqpt`](https://explorer.solana.com/tx/4WSZVABdNiLUoGgHe7GUDtmBGp2EKg2Ns1uWWV1vxfKAX4mXEKMgZuMBJpDRvppZxH7tAhCCSMYsp5xkdhjnpqpt?cluster=devnet) | [`0xcfa6...05d6`](https://sepolia.basescan.org/tx/0xcfa6a190230e7ba14d18f7d2cd1b7cf688bb10a01c4abc32bfb51f8b206e05d6) | [`0x3AFB...3fC1`](https://sepolia.basescan.org/address/0x3AFB1B91F1499E2228ff135241511e0613763fC1) |

The frozen NFT transfer was rejected by SPL Token with `Error: Account is frozen` during the proof run, then both token accounts were thawed by `end_game`. The manager queue is back to `0`.

## How It Works

The backend is a small Express relayer in `apps/relayer`. It serves the React demo state, reads live Solana/Base RPC status, and routes Base actions through a signing adapter.

1. The UI calls `/api/demo/queue` for each NFT agent.
2. The Solana game manager can queue real SPL NFTs and freeze their token accounts with its freeze-authority PDA.
3. The UI calls `/api/demo/mint-on-base`; the relayer creates an intent, policy-checks it against the active game, and asks the signing adapter to sign.
4. In mock mode, local mock dWallet private keys sign the Base action. With `LIVE_BASE_RELAY=true`, those keys send real Base Sepolia `mintClan(nftId)` transactions.
5. In Ika mode, the same adapter boundary is where the real Ika signing flow belongs once production/pre-alpha signing access is available.

## Run Locally

```sh
corepack enable
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev:relayer
pnpm dev:web
```

Open the Vite URL and use the guided buttons. The public hosted relayer is intentionally configured for repeatable judging:

```txt
SIGNING_ADAPTER=mock
LIVE_BASE_RELAY=false
```

To rerun the real manual proof from a funded environment:

```sh
SOLANA_KEYPAIR_PATH=/home/claude/code/clan-world/sealed-skill-nft-demo/data/solana/backend-keypair.json \
SOURCE_DEPLOYER_ENV_PATH=/home/claude/code/clan-world/clan-world-game/.env.local \
pnpm proof:manual
```

To rerecord the README video:

```sh
pnpm exec playwright install chromium
pnpm demo:record
```

## Project Map

- `apps/demo-web`: Vite/React control-room UI.
- `apps/relayer`: Express relayer, live RPC status, signing adapter orchestration.
- `programs/solana-game-manager`: Anchor program for queue, freeze, approve, and thaw.
- `contracts/base-clan-game`: Base Sepolia Solidity contract.
- `packages/core`: deterministic demo state machine used by UI, tests, and relayer.
- `scripts/run-manual-proof.ts`: real devnet/Base Sepolia proof runner.
- `scripts/record-demo-video.ts`: Playwright README video recorder.

## Ika Status

This PoC is wired to be Ika-ready, but the current public materials for Ika Solana pre-alpha describe mock-backed signing rather than production distributed MPC signing. The repo therefore separates the integration honestly:

- `SIGNING_ADAPTER=mock`: reliable demo and real Base Sepolia transactions from mock dWallet keys.
- `SIGNING_ADAPTER=ika`: adapter path for Ika pre-alpha endpoints.
- `LIVE_BASE_RELAY=true`: spend Base Sepolia gas and submit signed transactions.

The hackathon proof above uses real on-chain Solana and Base transactions, with the dWallet signer represented by fresh mock keys.
