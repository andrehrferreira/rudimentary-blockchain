# Rudimentary Blochchain

This project is a simple example of a blockchain written in Node.js, its use for production or application development is in no way recommended.

- Block genesis
- Creation of blocks
- Process queue
- HTTP server
- Miner (PoW)
- Consolidation

## Wallet Sample

Main Wallet
- Address:  0x1Ab8E76FaeF0892CB1083d85864d7C6200FB6462
- Private Key:  0x834ddd8a8d34ae8458cfc1d245a639fb80394dea50f34e70c7c77bb0dfe5c85f
- Mnemonic:  whisper steak modify manual sing giggle rent scheme autumn square boss soccer

Miner Wallet
- Address:  0x30924C46f73bf1733F130F28301d4c61785654Bc
- Private Key: 0xf00c4c2a80970e1732311265ca4507ea2b73f6ec839565c2255928719efcea68
- Mnemonic: way negative measure hold heavy innocent sister remind remember donate erupt speed

## Install dependeces

```bash
$ npm install
```

## Genesis

```json
{
    "balance": {
        "<WALLET SEED>": 1000000
    }
}
```

```bash
$ node genesis.js
```

## Server

```bash
$ yarn server
```

## Miner

```bash
$ yarn miner
```

## Server + Miner

```bash
$ yarn start
```

