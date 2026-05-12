import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("ClanWorldBaseGame", () => {
  it("mints a clan from msg.sender and prevents duplicates", async () => {
    const [dWalletA, dWalletB] = await ethers.getSigners();
    if (!dWalletA || !dWalletB) throw new Error("Hardhat signers missing");
    const factory = await ethers.getContractFactory("ClanWorldBaseGame");
    const game = await factory.deploy();

    await expect(game.connect(dWalletA).mintClan(1))
      .to.emit(game, "ClanMinted")
      .withArgs(dWalletA.address, 1, anyValue);

    expect(await game.walletByNftId(1)).to.eq(dWalletA.address);
    await expect(game.connect(dWalletA).mintClan(2)).to.be.revertedWithCustomError(game, "WalletAlreadyMinted");
    await expect(game.connect(dWalletB).mintClan(1)).to.be.revertedWithCustomError(game, "NftAlreadyMinted");
  });
});
