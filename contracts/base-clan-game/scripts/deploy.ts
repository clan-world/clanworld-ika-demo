import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("ClanWorldBaseGame");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`ClanWorldBaseGame deployed to ${address}`);
  console.log("Add this to root .env:");
  console.log(`BASE_CLAN_GAME_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
