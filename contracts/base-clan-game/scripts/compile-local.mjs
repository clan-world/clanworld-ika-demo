import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import solc from 'solc';

const sourceName = 'contracts/ClanWorldBaseGame.sol';
const contractName = 'ClanWorldBaseGame';
const source = readFileSync(sourceName, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    [sourceName]: { content: source }
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors ?? [];
for (const error of errors) {
  const line = `${error.severity}: ${error.formattedMessage ?? error.message}`;
  if (error.severity === 'error') console.error(line);
  else console.warn(line);
}
if (errors.some((error) => error.severity === 'error')) process.exit(1);

const compiled = output.contracts?.[sourceName]?.[contractName];
if (!compiled) throw new Error(`Missing compiled contract ${contractName}`);

const artifact = {
  _format: 'hh-sol-artifact-1',
  contractName,
  sourceName,
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
  linkReferences: {},
  deployedLinkReferences: {}
};

const out = join('artifacts', sourceName, `${contractName}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact, null, 2));
console.log(`Wrote ${out}`);
