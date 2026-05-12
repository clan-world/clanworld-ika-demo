export const clanWorldBaseGameAbi = [
  {
    type: "function",
    name: "mintClan",
    stateMutability: "nonpayable",
    inputs: [{ name: "nftId", type: "uint256" }],
    outputs: []
  },
  {
    type: "event",
    name: "ClanMinted",
    inputs: [
      { name: "dWallet", type: "address", indexed: true },
      { name: "nftId", type: "uint256", indexed: true },
      { name: "mintedAt", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "walletByNftId",
    stateMutability: "view",
    inputs: [{ name: "nftId", type: "uint256" }],
    outputs: [{ name: "dWallet", type: "address" }]
  }
] as const;
