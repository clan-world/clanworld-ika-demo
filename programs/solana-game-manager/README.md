# Solana Game Manager Program

Anchor program for the demo.

It can:

- initialize a game manager PDA,
- queue an NFT agent,
- start a two-player game,
- freeze selected NFT token accounts,
- approve exact Base action digests,
- end the game,
- thaw the NFTs.

Important: demo NFTs must be minted with the program freeze-authority PDA as their mint freeze authority. Otherwise `freeze_account` will fail.

## Build

```sh
anchor build
```

## Deploy to devnet

```sh
anchor deploy --provider.cluster devnet
```
