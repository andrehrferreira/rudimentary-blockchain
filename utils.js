const crypto = require('crypto');
const { ethers } = require("ethers");

exports.generateRandomId = () => {
    return crypto.createHash('sha256').update(new Date().getTime().toString()).digest('hex')
}

exports.createHash = (header) => {
    let target = this.getTarget(header);
    let hash = null;
    let nonce = 0;

    do{
        const dataCrypt = encrypt(`${header.id}${header.last}${header.timestamp}${JSON.stringify(header.transactions)}${nonce}`, nonce);
        hash = crypto.createHash('sha256').update(dataCrypt).digest('hex');
        nonce++;
    }
    while(!this.foundHash(target, hash));
    
    return { nonce, hash: "0x" + hash };
}

exports.getNextBlockId = (last) => {
    const intId = parseInt(last, 16);
    return "0x" + (intId + 1).toString(16);
}

exports.calculateWeight = (data) => {
    return JSON.stringify(data).length;
}

exports.getTarget = (header, difficulty = 1) => {
    const bits = JSON.stringify(header).length;
    return (bits * difficulty).toString('16');
}

exports.foundHash = (target, hash) =>{
    return Buffer.compare(Buffer.from(target), Buffer.from(hash)) > 0;
}

exports.createNonce = () => {
    return getRandomInt(0, 10000000);
}

exports.validateMessage = async (tx, signature) => {
    return await ethers.utils.verifyMessage(JSON.stringify(tx), signature);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function encrypt(plainText, password) {
    const iv = Buffer.alloc(16, 0); 
    const key = crypto.scryptSync(password.toString(), 'GfG', 24);
    const cipher = crypto.createCipheriv("aes-192-cbc", key, iv);
    let encrypted = cipher.update(plainText, "utf-8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString("base64");
}