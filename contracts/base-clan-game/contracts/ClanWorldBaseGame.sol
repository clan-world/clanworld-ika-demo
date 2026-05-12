// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ClanWorldBaseGame
/// @notice Tiny Base Sepolia contract for proving dWallet-originated game actions.
/// @dev The caller is the dWallet. Do not pass a dWallet address as an argument.
contract ClanWorldBaseGame {
    error NftAlreadyMinted(uint256 nftId);
    error WalletAlreadyMinted(address wallet);
    error InvalidNftId();

    event ClanMinted(address indexed dWallet, uint256 indexed nftId, uint256 mintedAt);

    mapping(uint256 nftId => address dWallet) public walletByNftId;
    mapping(address dWallet => uint256 nftId) public nftIdByWallet;
    mapping(address dWallet => bool minted) public hasMinted;

    function mintClan(uint256 nftId) external {
        if (nftId == 0) revert InvalidNftId();
        if (walletByNftId[nftId] != address(0)) revert NftAlreadyMinted(nftId);
        if (hasMinted[msg.sender]) revert WalletAlreadyMinted(msg.sender);

        walletByNftId[nftId] = msg.sender;
        nftIdByWallet[msg.sender] = nftId;
        hasMinted[msg.sender] = true;

        emit ClanMinted(msg.sender, nftId, block.timestamp);
    }
}
