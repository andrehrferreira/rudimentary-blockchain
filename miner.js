const axios = require('axios').default;
const crypto = require('crypto');
const { createHash, maxNonce } = require("./utils");
const minerWallet = "0x30924C46f73bf1733F130F28301d4c61785654Bc";

class Miner{
    constructor(){
        this.lastBlock = {};
    }

    async getBlock(){
        //console.log("Request job");

        try{
            return await axios.get('http://localhost:3232/queue');
        }
        catch(e){
            return null;
        }        
    }

    async startMiner(){
        try{
            const block = (await this.getBlock())?.data;

            if(block.id && block.hash && block.last && block.timestamp && block.id != this.lastBlock.id){
                console.log("New Job: " + block.id + " - " + block.timestamp);

                for(let nonce = 1; nonce <= maxNonce; nonce++){
                    const tmpHash = createHash(block, nonce);

                    if(tmpHash == block.hash){
                        this.lastBlock = block;
                        console.log("Win Nonce: " + nonce + " / Hash: " + block.hash);

                        try{
                            await axios.post('http://localhost:3232/solution', {
                                wallet: minerWallet,
                                nonce
                            }); 
                        }
                        catch(e){
                            console.log("Server offline... Try reconnect");
                        }                    

                        break;
                    }
                }
            }
        } catch(e) {}
        
        setTimeout(() => {
            this.startMiner(); 
        }, 10000);
    }
}

(() => {
    const miner = new Miner();
    miner.startMiner();
})();