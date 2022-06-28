const fs = require("fs");
const crypto = require('crypto');
const data = require("./data.json")
const { ethers } = require("ethers");
const { table } = require("table");
const express = require("express");
const cors = require('cors')
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { createHash, getNextBlockId, validateMessage, calculateWeight } = require("./utils");

class Server {
    constructor(data){
        this.data = data;
        this.blockClycle = 60*1*1000;
        this.coinPerBlock = 20;
        this.maxSupply = 20000000;
        this.difficulty = 1;
        this.app = express();
        this.app.use(bodyParser.urlencoded({ extended: false }))
        this.app.use(bodyParser.json());

        this.app.get("/createwallet", cors(), (req, res) => {
            const wallet = ethers.Wallet.createRandom();

            res.send({
                address: wallet.address,
                privateKey: wallet.privateKey,
                mnemonic: wallet.mnemonic.phrase
            });
        });

        this.app.get("/queue", cors(), (req, res) => {
            res.send(this.state.queue[0]);
        });

        this.app.get("/balances", cors(), (req, res) => {
            res.send(this.state.wallets);
        });

        this.app.get("/balance/:wallet", cors(), (req, res) => {
            if(this.state.wallets[req.params.wallet]) 
                res.send({balance: this.state.wallets[req.params.wallet]}) 
            else    
                res.send({balance: 0});
        });

        this.app.post("/transaction", cors(), (req, res) => {
            try{
                if(req.body.tx && req.body.signature){
                    if(validateMessage(req.body.tx, req.body.signature)){
                        const reciveId = uuidv4();

                        this.state.transactions.push({
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

                        this.saveState();
                        res.send(reciveId);
                    }                
                }
            }   
            catch(e){
                res.send(null);
            }
        });

        this.app.get("/tx/:id", cors(), async (req, res) => {
            if(this.state.tx[req.params.id]) {
                res.send(this.state.tx[req.params.id])
            }  
            else {
                if(fs.existsSync(`./transactions/${req.params.id}.json`)){
                    const transaction = await fs.readFileSync(`./transactions/${req.params.id}.json`);
                    res.send(JSON.parse(transaction.toString()));
                }
                else{
                    res.status(404).end();
                }
            };
        });

        this.app.post("/solution", cors(), (req, res) => {
            const validation = req.body;

            if(validation && validation.nonce && this.state.queue[0]){
                if(createHash(this.state.queue[0], validation.nonce) === this.state.queue[0].hash){
                    try{
                        let lastBlock = this.state.queue[0];
                        this.state.queue = [];

                        if(!this.state.wallets[validation.wallet])
                            this.state.wallets[validation.wallet] = 0;

                        this.state.wallets[validation.wallet] += this.coinPerBlock;

                        if(lastBlock.transactions && lastBlock.transactions?.length > 0){
                            for(let key in lastBlock.transactions){
                                const transaction = lastBlock.transactions[key];

                                if(validateMessage(transaction, transaction.signature)){
                                    if(this.state.wallets[transaction.from] >= transaction.balance){
                                        this.state.wallets[transaction.from] -= transaction.balance;

                                        if(!this.state.wallets[transaction.to])
                                            this.state.wallets[transaction.to] = 0;

                                        this.state.wallets[transaction.to] += transaction.balance;

                                        this.state.transactions[transaction.reciveId].block = lastBlock.id;
                                        this.state.transactions[transaction.reciveId].status = "success";
                                        this.state.transactions[transaction.reciveId].nonce = validation.nonce.toString(16);
                                        this.state.transactions[transaction.reciveId].minedby = validation.wallet;
                                        this.state.transactions[transaction.reciveId].reward = this.coinPerBlock;

                                        lastBlock.transactions[key].status = "success";
                                    }
                                    else{
                                        this.state.transactions[transaction.reciveId].status = "fail";
                                        lastBlock.transactions[key].status = "fail";
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
                        console.log("Error: ", e);
                    }
                }
            }
        }); 

        this.state = {
            wallets: {},
            queue: [],
            lastBlock: {},
            transactions: []
        };

        setInterval(() => {
            this.createBlock();
        }, this.blockClycle);

        this.app.listen(3232);
        console.log("Server listen on 3232");
    }   

    start(){
        if(fs.existsSync("./state.json")){
            const stateCached = JSON.parse(fs.readFileSync("./state.json"));
            this.state = { ...this.state, ...stateCached };
        }
        else{
            for(let key in this.data){                
                for(let keyTransaction in this.data[key].transactions){
                    const transation = this.data[key].transactions[keyTransaction];
                    
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
        for(let key in this.state.transactions){
            fs.writeFileSync(`./transactions/${key}.json`, JSON.stringify(this.state.transactions[key], null, 4));
        }

        this.state.transactions = [];
        fs.writeFileSync("./state.json", JSON.stringify(this.state, null, 4));
    }

    createBlock(){
        if(this.state.queue.length === 0){
            let header = {
                id: getNextBlockId(this.state.lastBlock.id),
                last: this.state.lastBlock.id,
                timestamp: new Date().getTime(),
                transactions: this.state.transactions,
                difficulty: this.difficulty
            };

            header.weight = calculateWeight(header);

            this.state.transactions = [];
            this.state.queue.push(header);
            this.saveState();
            console.log("New block:" + header.id);            
        }
        else{
            //console.log("Last block not validated.");
        }
    }
}

(() => {
    const server = new Server(data);
    server.start();
})();