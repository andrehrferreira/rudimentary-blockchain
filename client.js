const axios = require('axios').default;
const { ethers } = require("ethers");
const { generateRandomId, validateMessage } = require("./utils"); 

class Client {

    constructor(privateKey){
        this.privateKey = privateKey;
        this.wallet = new ethers.Wallet(this.privateKey);
    }

    async createTX(to, value){
        const tx = {
            id: generateRandomId(),
            from: this.wallet.address,
            to: to,
            balance: value,
            timestamp: new Date().getTime()
        }

        const signature = await this.sign(tx);

        return { tx, signature };
    }

    async sign(data){
        let dataSigned = await this.wallet.signMessage(JSON.stringify(data));
        return dataSigned;
    }    

    async send(transaction){
        try{
            const txId = await axios.post('http://localhost:3232/transaction', transaction); 
            return txId;
        }
        catch(e){
            return null;
        }
    }
}

(async () => {
    const clientAgent = new Client("0x834ddd8a8d34ae8458cfc1d245a639fb80394dea50f34e70c7c77bb0dfe5c85f");
    const transaction = await clientAgent.createTX("0x30924C46f73bf1733F130F28301d4c61785654Bc", 10000);
    const { tx, signature } = transaction;
    console.log(transaction);

    const walletSinger = await validateMessage(tx, signature);

    if(walletSinger == tx.from)
        console.log("Transaction validate!");

    const sendTx = await clientAgent.send(transaction);
    console.log("Recived: ", sendTx.data);
})();