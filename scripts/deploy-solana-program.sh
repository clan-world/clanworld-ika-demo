#!/usr/bin/env bash
set -euo pipefail
cd programs/solana-game-manager
anchor build
anchor deploy --provider.cluster devnet
