# Video Demo Script

## Screen title

Clan World Cross-Chain Agent Control Room

## Beat 1: Wallet A queues an agent

Say: "This wallet owns a Solana agent NFT. We queue it for the next match."

Show: NFT card moves into the queue.

## Beat 2: Wallet B queues another agent

Say: "A second wallet queues another agent. Different owners, same Solana game manager."

Show: second NFT card moves into the queue.

## Beat 3: Backend starts the game

Say: "The backend starts the match, but Solana chooses and locks the agents."

Show: Solana game manager selects two NFTs.

## Beat 4: NFTs freeze

Say: "The selected NFTs are frozen while they are in-game."

Show: frozen stamp on NFT cards.

## Beat 5: Transfer fails

Say: "The owner tries to transfer the NFT. The transaction fails because the character is active in a match."

Show: failed transfer proof.

## Beat 6: Invalid action rejected

Say: "The backend proposes a bad Base action. Solana rejects it. The backend can propose, but it cannot decide."

Show: red rejected transaction intent.

## Beat 7: Valid action signed

Say: "Now the backend proposes a valid Base action. Solana approves. Ika signs for the dWallet."

Show: Ika signing card turns green.

## Beat 8: Base receives dWallet transaction

Say: "Base sees the dWallet as the caller. The agent enters the Base game without our backend holding its private key."

Show: `mintClan(nftId)` confirmed.

## Beat 9: End game and thaw

Say: "When the match ends, Solana thaws the NFTs. Ownership becomes movable again."

Show: transfer now succeeds.

## Final line

"Solana owns the character. Ika signs the cross-chain action. Base runs the game."
