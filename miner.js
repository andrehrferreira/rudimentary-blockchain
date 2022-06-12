const axios = require('axios').default;
const crypto = require('crypto');
const readline = require('readline');
const { Worker, isMainThread, parentPort } = require('node:worker_threads');
const { createHash, createNonce } = require("./utils");
const minerWallet = "0x30924C46f73bf1733F130F28301d4c61785654Bc";

class Miner{
    constructor(){
        this.lastBlock = {};
        this.hashRate = 0;
        this.maxParalaxProcess = 50;
        this.total = 0;
        this.persistentProgress = null;
        this.block = {};
    }

    async getBlock(){
        try{
            return await axios.get('http://localhost:3232/queue');
        }
        catch(e){
            return null;
        }        
    }

    async startMiner(block){
        try{
            this.block = block;

            if(this.block.id && this.block.hash && this.block.last && this.block.timestamp){                
                this.lastBlock = this.block;
                this.hashRate = 0;

                setInterval(async () => {
                    const nonce = createNonce();
                    const tmpHash = createHash(this.block, nonce);
                    this.hashRate++;
                    this.total++;

                    if(tmpHash === this.block.hash){
                        //console.log("Win Nonce: " + nonce + " / Hash: " + this.block.hash);

                        try{
                            await axios.post('http://localhost:3232/solution', {
                                wallet: minerWallet,
                                nonce: nonce
                            }); 

                            parentPort.postMessage("nextBlock");
                        }
                        catch(e){
                            console.log("Server offline... Try reconnect");
                        } 
                    }
                }, 10);
            }
        } catch(e) {}
    }
}

(async () => {
    if(isMainThread){
        const miner = new Miner();
        const block = (await miner.getBlock())?.data;
        let lastBlockId = 0;

        setInterval(async () => {
            const nextBlock = (await miner.getBlock())?.data;

            if(nextBlock && nextBlock.id !== lastBlockId){
                lastBlockId = nextBlock.id;
                threads.map((worker) => worker.postMessage(nextBlock));
                console.log(`New Job: ${nextBlock.id}`);
            }
        }, 3000);    

        let threads = [];
        let summary = []

        for(let i = 0; i < 10; i++){
            const worker = new Worker(__filename, { workerData: "./miner.js" });
            threads.push(worker);

            worker.on('message', async (data) => {                
                summary.push(data);

                if(summary.length === 10){
                    let hashRateAllThread = 0;
                    let totalAllThread = 0;

                    summary.map(({ hashRate, total }) => { 
                        hashRateAllThread += hashRate;
                        totalAllThread += total
                    });

                    summary = [];

                    //readline.cursorTo(process.stdout, 0);
                    //process.stdout.write(`Hashrate: ${hashRateAllThread}hs / ${totalAllThread}`);
                }                              
            });

            worker.postMessage(block);
        }
    }
    else{
        let miner = new Miner();

        parentPort.once('message', (message) => {
            miner = new Miner();
            miner.startMiner(message);
        });
        
        setInterval(() => {
            parentPort.postMessage({ hashRate: miner.hashRate, total: miner.total })
            miner.hashRate = 0;
        }, 1000);
    }
     
})();