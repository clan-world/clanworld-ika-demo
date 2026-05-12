# Run Book

This is the practical checklist to run the demo.

## 0. What you are building

The demo shows two Solana NFT agents entering a game. The Solana program freezes the selected NFTs. A transfer fails while the NFT is frozen. The backend asks a signing adapter for Base Sepolia transactions. In mock mode the adapter signs with local demo keys. In Ika mode the adapter calls the Ika pre-alpha path. Base receives `mintClan(nftId)` from each dWallet address.

## 1. Install tools

Install Node 22 or newer. Enable pnpm:

```sh
corepack enable
```

Install Solana, Rust, and Anchor using Solana's quick installer:

```sh
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
```

Check tools:

```sh
node --version
pnpm --version
solana --version
anchor --version
```

## 2. Install repo dependencies

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

The critical tests do not touch live chains. They verify the highest-risk logic: queue, freeze, failed transfer, rejected invalid action, valid Base mint, and thaw. The build also compiles the React UI and compiles the Solidity contract with local solc-js.

## 3. Configure environment

```sh
cp .env.example .env
```

Set these first:

- `SOLANA_RPC_URL`
- `BASE_SEPOLIA_RPC_URL`
- `BASE_RELAYER_PRIVATE_KEY`
- `SIGNING_ADAPTER=mock`
- `MOCK_DWALLET_PRIVATE_KEYS`

Use mock mode for the first recording. Switch to Ika after the rest of the system works. Keep `LIVE_BASE_RELAY=false` until the UI, relayer, and contract address are all correct.

## 4. Deploy the Base Sepolia contract

```sh
cp contracts/base-clan-game/.env.example contracts/base-clan-game/.env
# edit contracts/base-clan-game/.env
scripts/deploy-base-contract.sh
```

Copy the deployed address into the root `.env` as `BASE_CLAN_GAME_ADDRESS`.

## 5. Deploy the Solana game manager

```sh
scripts/deploy-solana-program.sh
```

Copy the deployed program id into root `.env` as `SOLANA_PROGRAM_ID`.

Then initialize game manager state:

```sh
pnpm tsx scripts/init-solana-game-manager.ts
```

## 6. Mint demo NFTs

The simplest POC uses normal SPL-token NFTs with amount 1 and decimals 0. The freeze authority must be the Solana program freeze-authority PDA.

```sh
pnpm tsx scripts/mint-demo-nfts.ts
```

Put the minted addresses into:

```txt
SOLANA_DEMO_NFT_MINTS=mint1,mint2,mint3
```

## 7. Run local demo

Terminal A:

```sh
pnpm dev:relayer
```

Terminal B:

```sh
pnpm dev:web
```

Open the Vite URL. Use the buttons in order:

1. Connect wallet A.
2. Queue NFT 1.
3. Switch to wallet B.
4. Queue NFT 2.
5. Start game.
6. Try transfer.
7. Try invalid Base action.
8. Mint player 1 on Base.
9. Mint player 2 on Base.
10. End game and thaw.

## 8. Optional: send real Base Sepolia transactions in mock mode

Set:

```txt
LIVE_BASE_RELAY=true
MOCK_DWALLET_PRIVATE_KEYS=0xplayer1_private_key,0xplayer2_private_key
```

Fund those two derived Base addresses with Base Sepolia ETH. The relayer will still show the signing-adapter step, then it will send real `mintClan(nftId)` calls to `BASE_CLAN_GAME_ADDRESS`.

Leave this off while designing the video. Turn it on only when you want live explorer proofs.

## 9. Switch from mock signing to Ika

Set:

```txt
SIGNING_ADAPTER=ika
IKA_ENABLED=true
IKA_PRE_ALPHA_ENDPOINT=...
IKA_PROGRAM_ID=...
IKA_DWALLET_IDS=...
IKA_DWALLET_BASE_ADDRESSES=...
```

The repo isolates Ika in `packages/signing-adapter` and `packages/ika-sdk`. That is intentional because Ika Solana support is pre-alpha and its API may change.

## 10. Deploy demo infra on AWS

The cheapest normal path is:

- UI: S3 plus CloudFront.
- Relayer: optional App Runner container.

```sh
cd infra/aws/terraform
terraform init
terraform plan -var="enable_relayer=false"
terraform apply -var="enable_relayer=false"
```

To host the relayer too, first build and push the relayer Docker image to ECR, then:

```sh
terraform apply \
  -var="enable_relayer=true" \
  -var="relayer_image=<your-ecr-image-url>"
```

## 11. Tear down AWS

```sh
cd infra/aws/terraform
terraform destroy
```

Also delete any ECR images if AWS blocks repository deletion.

## 12. Common problems

### The NFT transfer does not fail

Check that the mint freeze authority is the program PDA. If the mint was created with a different freeze authority, the game manager cannot freeze it.

### Base transaction does not send

Check Base Sepolia ETH on the dWallet address used by the signing adapter.

### Ika signing fails

Return to mock mode, finish the rest of the demo, then debug Ika. The Ika adapter is isolated so the whole demo is not blocked by pre-alpha changes.

### Live RPC status is blank

The UI asks the relayer for the current Solana devnet slot and Base Sepolia block. If those are blank, check `SOLANA_RPC_URL`, `BASE_SEPOLIA_RPC_URL`, and relayer logs.
