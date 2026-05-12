# Future Roadmap

## Phase 1: Demo POC

- Two Solana NFT agents.
- Queue and start game on Solana devnet.
- Freeze selected NFTs.
- Show failed transfer.
- Use mock signing or Ika pre-alpha signing.
- Relay `mintClan(nftId)` to Base Sepolia.
- End game and thaw NFTs.

## Phase 2: Stronger chain proof

- Replace guided in-memory demo state with full event indexing.
- Show live Solana and Base explorer links for every action.
- Add exact Base transaction digest approval on Solana.
- Add replay protection and expected nonce tracking.

## Phase 3: Real game integration

- Replace `mintClan` with game actions.
- Add agent REPL and whisper burn flow.
- Burn 5 GOLD for user steering messages.
- Verify whisper owner owns an in-game NFT.
- Pipe the whisper into the selected agent runtime.

## Phase 4: Persistent agent identities

- One dWallet per NFT.
- Agent reputation/history follows the NFT.
- Marketplace transfer moves the agent identity.
- Game history visible across chains.

## Phase 5: Production hardening

- Remove mock signing from production builds.
- Use production Ika once available and audited.
- Add policy tests for every allowed Base function.
- Add monitoring, alerting, and transaction retry logic.
- Add secure key management for deploy keys.
- Add private RPCs for recording reliability.
