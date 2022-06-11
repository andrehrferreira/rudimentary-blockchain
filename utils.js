const crypto = require('crypto');
const { ethers } = require("ethers");

const maxNonce = 1000000;
exports.maxNonce = maxNonce;

exports.generateRandomId = () => {
    return crypto.createHash('sha1').update(new Date().getTime().toString()).digest('hex')
}

exports.createHash = (header, nonce) => {
    try{
        return crypto.createHash('sha1').update(
            `${header.id}${header.last}${header.timestamp}${nonce}`
        ).digest('hex');
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