const fs = require("fs");
const crypto = require('crypto');
const settingsSeed = require("./genesis.json");
const { ethers } = require("ethers");
const { createHash, getNextBlockId } = require("./utils");
const blockchainData = "./data.json";

class Seed {
    constructor(privateKey){
        this.privateKey = privateKey;        
    }

    async createSeed(){    
        let header = {
            id: getNextBlockId("0x0"),
            last: "0x0",
            timestamp: new Date().getTime(),     
        };
    
        let { nonce, hash } = createHash(header);

        header.hash = hash;
        header.nonce = nonce;
        header.transactions = [];

        for(let key in settingsSeed.balance){
            const wallet = key;
            const balance = settingsSeed.balance[key];

            let transaction = {
                from: "0x0",
                to: wallet,
                balance: balance
            };

            transaction.sign = await this.sign(transaction);
            header.transactions.push(transaction);
        }        
    
        fs.writeFileSync(blockchainData, JSON.stringify([header], null, 4));
    }

    async sign(data){
        let wallet = new ethers.Wallet(this.privateKey);
        let dataSigned = await wallet.signMessage(JSON.stringify(data));
        return dataSigned;
    }    
}

(async () => {
    const seedData = new Seed("0x834ddd8a8d34ae8458cfc1d245a639fb80394dea50f34e70c7c77bb0dfe5c85f");
    await seedData.createSeed();
})();