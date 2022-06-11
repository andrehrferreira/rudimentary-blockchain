const axios = require('axios').default;
const crypto = require('crypto');
const readline = require('readline');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { createHash, createNonce, maxNonce } = require("./utils");
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
        //console.log("Request job");

        try{
            return await axios.get('http://localhost:3232/queue');
        }
        catch(e){
            return null;
        }        
    }

    stopMiner(){
        clearInterval(this.persistentProgress);
        this.lastBlock = {};
        this.startMiner();
    }

    async startMiner(block){
        try{
            this.block = block;

            if(this.block.id && this.block.hash && this.block.last && this.block.timestamp && this.block.id != this.lastBlock.id){
                console.log("New Job: " + this.block.id + " - " + this.block.timestamp);
                
                this.lastBlock = this.block;
                this.hashRate = 0;

                this.persistentProgress = setInterval(async () => {
                    let paralaxProcess = [];

                    for(let i = 0; i < this.maxParalaxProcess; i++){
                        paralaxProcess.push(new Promise((resolve, reject) => {
                            const nonce = createNonce();
                            const tmpHash = createHash(this.block, nonce);
                            this.hashRate++;
                            this.total++;

                            if(tmpHash === this.block.hash)
                                resolve(nonce);
                            else
                                resolve(null);
                        }));
                    }

                    Promise.all(paralaxProcess).then(async (results) => {
                        results.map(async (result) => {
                            if(result){
                                console.log("Win Nonce: " + result + " / Hash: " + this.block.hash);

                                try{
                                    await axios.post('http://localhost:3232/solution', {
                                        wallet: minerWallet,
                                        nonce: result
                                    }); 

                                    parentPort.postMessage("nextBlock");
                                }
                                catch(e){
                                    console.log("Server offline... Try reconnect");
                                }                    

                                clearInterval(this.persistentProgress);
                                this.startMiner();
                            }
                        })
                    });
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
            
            if(nextBlock.id !== lastBlockId){
                lastBlockId = nextBlock.id;
                threads.map((worker) => worker.postMessage(nextBlock));
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