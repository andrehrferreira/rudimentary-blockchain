const fs = require("fs");
const crypto = require('crypto');
const settingsSeed = require("./genesis.json");
const { ethers } = require("ethers");
const blockchainData = "./data.json";

class Seed {
    constructor(privateKey){
        this.privateKey = privateKey;        
    }

    async createSeed(){
        const nonce = this.createNonce();
    
        let header = {
            id: crypto.createHash('sha1').update(new Date().getTime().toString()).digest('hex'),
            last: "0x0",
            timestamp: new Date().getTime(),
            nonce: nonce        
        };
    
        header.hash = this.createHash(header);
        header.tx = { transactions: [] };
        let counter = 0;

        for(let key in settingsSeed.balance){
            const wallet = key;
            const balance = settingsSeed.balance[key];

            header.tx.transactions.push({
                from: "0x0",
                to: wallet,
                balance: balance
            });
        }

        header.tx.sign = await this.sign(header.tx);
    
        fs.writeFileSync(blockchainData, JSON.stringify([header], null, 4));
    }

    createNonce(){
        return this.getRandomInt(0, 1000);
    }

    async sign(data){
        let wallet = new ethers.Wallet(this.privateKey);
        let dataSigned = await wallet.signMessage(JSON.stringify(data));
        return dataSigned;
    }    

    createHash(header){
        return crypto.createHash('sha1').update(
            `${header.id}${header.last}${header.timestamp}${header.nonce}`
        ).digest('hex');
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
}

(async () => {
    const seedData = new Seed("0x834ddd8a8d34ae8458cfc1d245a639fb80394dea50f34e70c7c77bb0dfe5c85f");
    await seedData.createSeed();
})();