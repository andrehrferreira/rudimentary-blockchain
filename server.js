const fs = require("fs");
const crypto = require('crypto');
const data = require("./data.json")
const { ethers } = require("ethers");
const { table } = require("table");
const express = require("express");
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { createHash, createNonce, generateRandomId, validateMessage } = require("./utils");

class Server {
    constructor(data){
        this.data = data;
        this.blockClycle = 60*5*1000;
        this.coinPerBlock = 20;
        this.maxSupply = 20000000;
        this.app = express();
        this.transactions = [];
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

        this.app.post("/transaction", (req, res) => {
            try{
                if(req.body.tx && req.body.signature){
                    if(validateMessage(req.body.tx, req.body.signature)){
                        const reciveId = uuidv4();

                        this.transactions.push({
                            reciveId,
                            tx: req.body.tx,
                            signature: req.body.signature
                        });

                        this.state.tx[reciveId] = {
                            reciveId,
                            tx: req.body.tx,
                            signature: req.body.signature,
                            status: "queue"
                        }

                        res.send(reciveId);
                    }                
                }
            }   
            catch(e){
                res.send(null);
            }
        });

        this.app.get("/tx/:id", (req, res) => {
            return (this.state.tx[req.params.id]) ? this.state.tx[req.params.id] : null;
        });

        this.app.post("/solution", (req, res) => {
            const validation = req.body;

            if(validation && validation.nonce){
                if(createHash(this.state.queue[0], validation.nonce) === this.state.queue[0].hash){
                    try{
                        let lastBlock = this.state.queue[0];
                        this.state.queue = [];

                        if(!this.state.wallets[validation.wallet])
                            this.state.wallets[validation.wallet] = 0;

                        this.state.wallets[validation.wallet] += this.coinPerBlock;

                        if(lastBlock.tx.transactions.length > 0){
                            for(let key in lastBlock.tx.transactions){
                                const transaction = lastBlock.tx.transactions[key];

                                if(validateMessage(transaction.tx, transaction.signature)){
                                    if(this.state.wallets[transaction.from] >= transaction.balance){
                                        this.state.wallets[transaction.from] -= transaction.balance;

                                        if(!this.state.wallets[transaction.to])
                                            this.state.wallets[transaction.to] = 0;

                                        this.state.wallets[transaction.to] += transaction.balance;

                                        this.state.tx[transaction.reciveId].block = lastBlock.id;
                                        this.state.tx[transaction.reciveId].status = "success";
                                        this.state.tx[transaction.reciveId].nonce = validation.nonce.toString(16);
                                        this.state.tx[transaction.reciveId].minedby = validation.wallet;
                                        this.state.tx[transaction.reciveId].reward = this.coinPerBlock;
                                    }
                                    else{
                                        this.state.tx[transaction.reciveId].status = "fail";
                                    }
                                }
                            }
                        }

                        //Finish
                        lastBlock.nonce = validation.nonce.toString(16);
                        lastBlock.minedby = validation.wallet;
                        lastBlock.reward = this.coinPerBlock;
                        this.state.lastBlock = lastBlock;
                        this.data.push(lastBlock);
                        this.saveData();
                        this.saveState();

                        console.log("Found block Nonce:"+ validation.nonce + " / Wallet: " + validation.wallet);
                    }
                    catch(e){
                        console.log("Error: "+e);
                    }
                }
            }
        }); 

        this.state = {
            wallets: {},
            queue: [],
            lastBlock: {},
            tx: {}
        };

        setInterval(() => {
            this.createBlock();
        }, this.blockClycle);

        this.app.listen(3232);
    }   

    start(){
        if(fs.existsSync("./state.json")){
            const stateCached = JSON.parse(fs.readFileSync("./state.json"));
            this.state = { ...this.state, ...stateCached };
            console.log(table(this.stateToTable()));
        }
        else{
            for(let key in this.data){                
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
            const nonce = createNonce();

            let header = {
                id: generateRandomId(),
                last: this.state.lastBlock.id,
                timestamp: new Date().getTime(),
                tx: { transactions: this.transactions }
            };

            this.transactions = [];
            header.hash = createHash(header, nonce);

            this.state.queue.push(header);
            this.saveState();

            console.log("New block:" + header.id);
        }
        else{
            console.log("Last block not validated.");
        }
    }
}

(() => {
    const server = new Server(data);
    server.start();
})();