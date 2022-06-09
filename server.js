const fs = require("fs");
const crypto = require('crypto');
const data = require("./data.json")
const { ethers } = require("ethers");
const { table } = require("table");
const express = require("express");
const bodyParser = require('body-parser');

class Server {
    constructor(data){
        this.data = data;
        this.blockClycle = 60*1000;
        this.coinPerBlock = 20;
        this.maxSupply = 20000000;
        this.app = express();
        this.app.use(bodyParser.urlencoded({ extended: false }))
        this.app.use(bodyParser.json())

        this.app.get("/queue", (req, res) => {
            res.send(this.state.queue[0]);
        });

        this.app.get("/balances", (req, res) => {
            res.send(this.state.wallets);
        });

        this.app.get("/balance/:wallet", (req, res) => {
            res.send(this.state.wallets[req.params.wallet]);
        });

        this.app.post("/solution", (req, res) => {
            const validation = req.body;

            if(validation && validation.nonce){
                if(this.createHash(this.state.queue[0], validation.nonce) === this.state.queue[0].hash){
                    let lastBlock = this.state.queue[0];
                    this.state.queue = [];

                    if(!this.state.wallets[validation.wallet])
                        this.state.wallets[validation.wallet] = 0;

                    this.state.wallets[validation.wallet] += this.coinPerBlock;
                    
                    lastBlock.nonce = validation.nonce.toString(16);
                    lastBlock.minedby = validation.wallet;
                    lastBlock.reward = this.coinPerBlock;
                    this.state.lastBlock = lastBlock;
                    this.data.push(lastBlock);
                    this.saveData();
                    this.saveState();

                    console.log("Found block Nonce:"+ validation.nonce + " / Wallet: " + validation.wallet);
                }
            }
        }); 

        this.state = {
            wallets: {},
            queue: [],
            lastBlock: {}
        };

        setInterval(() => {
            this.createBlock();
        }, this.blockClycle);

        this.app.listen(3232);
    }   

    start(){
        if(fs.existsSync("./state.json")){
            const stateCached = JSON.parse(fs.readFileSync("./state.json"));
            this.state = stateCached;
            
            console.log(table(this.stateToTable()));
        }
        else{
            for(let key in this.data){
                for(let keyTx in this.data[key].tx.transactions){
                    for(let keyTransaction in this.data[key].tx.transactions){
                        const transation = this.data[key].tx.transactions[keyTransaction];
                        
                        if(!this.state.wallets[transation.from] && transation.from !== "0x0")
                            this.state.wallets[transation.from] = 0;

                        if(this.state.wallets[transation.from] && transation.from !== "0x0")
                            this.state.wallets[transation.from] -= transation.balance;
                        
                        if(!this.state.wallets[transation.to])
                            this.state.wallets[transation.to] = 0;
    
                        this.state.wallets[transation.to] += transation.balance; 
                    };
                }
    
                this.state.lastBlock = this.data[key];
            }

            console.log(table(this.stateToTable()));
            this.saveState();
        }

        this.createBlock();
    }

    stateToTable(){
        let output = [];

        for(let key in this.state.wallets)
            output.push([key, this.state.wallets[key]])
        
        return output
    }

    saveData(){
        fs.writeFileSync("./data.json", JSON.stringify(this.data, null, 4));
    }

    saveState(){
        fs.writeFileSync("./state.json", JSON.stringify(this.state, null, 4));
    }

    createBlock(){
        if(this.state.queue.length === 0){
            const nonce = this.createNonce();

            let header = {
                id: crypto.createHash('sha1').update(new Date().getTime().toString()).digest('hex'),
                last: this.state.lastBlock.id,
                timestamp: new Date().getTime(),
                tx: { transactions: [] }
            };

            header.hash = this.createHash(header, nonce)

            this.state.queue.push(header);
            this.saveState();

            console.log("New block:" + header.id);
        }
        else{
            console.log("Last block not validated.");
        }
    }

    createNonce(){
        return this.getRandomInt(0, 1000);
    }

    createHash(header, nonce){
        return crypto.createHash('sha1').update(
            `${header.id}${header.last}${header.timestamp}${nonce}`
        ).digest('hex');
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
}

(() => {
    const server = new Server(data);
    server.start();
})();