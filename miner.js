const axios = require('axios').default;
const crypto = require('crypto');
const minerWallet = "0x30924C46f73bf1733F130F28301d4c61785654Bc";

class Miner{
    constructor(){
        this.lastBlock = {};
    }

    async getBlock(){
        console.log("Request job");
        return await axios.get('http://localhost:3232/queue');
        
    }

    async startMiner(){
        const block = (await this.getBlock()).data;

        if(block.id && block.hash && block.last && block.timestamp && block.id != this.lastBlock.id){
            console.log("New Job: " + block.id + " - " + block.timestamp);

            for(let i = 1; i <= 1000; i++){
                const tmpHash = this.createHash(block, i);

                if(tmpHash == block.hash){
                    this.lastBlock = block;
                    console.log("Win Nonce: " + i + " / Hash: " + block.hash);

                    await axios.post('http://localhost:3232/solution', {
                        wallet: minerWallet,
                        nonce: i
                    }); 

                    break;
                }
            }
        }

        setTimeout(() => {
            this.startMiner(); 
        }, 10000);
    }

    createHash(header, nonce){
        return crypto.createHash('sha1').update(
            `${header.id}${header.last}${header.timestamp}${nonce}`
        ).digest('hex');
    }
}

(() => {
    const miner = new Miner();
    miner.startMiner();
})();