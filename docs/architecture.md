# Architecture

## One-sentence version

Solana is the ownership and policy layer. Ika is the cross-chain signer. Base is the game execution layer.

## Main flow

1. A user owns an agent NFT on Solana.
2. The user queues that NFT in the Solana game manager.
3. The backend starts a game.
4. The Solana program selects queued NFTs.
5. The Solana program freezes the selected NFT token accounts.
6. Each NFT maps to a dWallet and Base address.
7. The relayer builds a Base transaction intent.
8. Solana policy approves or rejects the intent.
9. Ika or mock signing signs the Base transaction.
10. The relayer broadcasts the transaction to Base Sepolia.
11. The Base contract records the clan for `msg.sender`, which is the dWallet address.
12. End game thaws the NFTs.

## Diagram

```txt
Solana Wallets
  NFT owners
      |
      v
Solana Game Manager
  queue -> start -> freeze -> approve action -> thaw
      |
      v
Signing Adapter
  mock for recording
  Ika for pre-alpha signing
      |
      v
Base Sepolia
  ClanWorldBaseGame.mintClan(nftId)
```

## Why `mintClan(nftId)`

The Base contract does not accept `dWallet` as an argument. It uses `msg.sender`.

That proves the dWallet address actually signed the transaction.

## Packages

### apps/demo-web

The single-screen animated UI. It shows wallets, NFT cards, queue, frozen state, Ika signing, Base confirmations, and proofs.

### apps/relayer

The backend service. It watches state, creates Base transaction intents, asks the signing adapter to sign, broadcasts to Base, and exposes event data to the UI.

### apps/operator-cli

Small manual CLI for setup and troubleshooting.

### programs/solana-game-manager

Anchor program for queueing, starting games, freezing NFTs, approving Base action digests, ending games, and thawing NFTs.

### contracts/base-clan-game

Small Base Sepolia contract. It stores which dWallet minted which Solana NFT ID.

### packages/core

Shared types and critical state machine. Tests focus here.

### packages/solana-sdk

Client helpers for program addresses, queue instructions, freeze status, and transfer attempts.

### packages/base-sdk

Viem helpers for Base Sepolia calls, transaction building, and event reading.

### packages/signing-adapter

Shared signing interface plus mock and Ika adapters.

### packages/ika-sdk

Thin wrapper for Ika pre-alpha SDK calls. Keep this small because the API can change.

### packages/config

Environment parsing and typed config.

### packages/proofs

Explorer links and proof card formatting.

## Security model

The backend can propose an action. It should not be trusted to decide final authority.

The Solana program checks:

- Game is active.
- NFT is selected and frozen.
- dWallet matches the NFT.
- Base contract is allowed.
- Function is allowed.
- Action digest is exact.

Only then should a signing request be approved.

## Demo modes

### Guided mode

The UI uses the relayer state machine so the video is easy to record. It still shows live Solana devnet and Base Sepolia RPC status.

### Live Base relay mode

Set `LIVE_BASE_RELAY=true` to make mock dWallet private keys send real Base Sepolia `mintClan(nftId)` transactions.

### Ika mode

Set `SIGNING_ADAPTER=ika` to route signing through the Ika adapter. This path is isolated because Ika Solana support is pre-alpha.

## POC simplification

For the first recording, use two players. Four players are the same flow repeated twice more. The Solana program stores a small fixed queue of up to 12 agents for the demo.

## Production changes

- Persistent dWallet per NFT.
- Real Ika signing only after pre-alpha becomes suitable for production.
- Stronger EVM nonce management.
- Full on-chain event indexing.
- Wallet-safe NFT minting flow.
- Transaction digest binding that includes chain ID, nonce, gas, target, and calldata.
