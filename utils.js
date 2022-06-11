const crypto = require('crypto');
const { ethers } = require("ethers");

const maxNonce = 10000;
exports.maxNonce = maxNonce;

exports.generateRandomId = () => {
    return crypto.createHash('sha256').update(new Date().getTime().toString()).digest('hex')
}

exports.createHash = (header, nonce) => {
    try{
        const dataCrypt = encrypt(`${header.id}${header.last}${header.timestamp}${nonce}`, nonce);
        const hash = crypto.createHash('sha256').update(dataCrypt).digest('hex');
        return hash;
    }
    catch(e){
        console.log(header)
    }
}

exports.createNonce = () => {
    return getRandomInt(0, maxNonce);
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