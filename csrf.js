const Crypto = require('crypto');
const Util = require('util');
const TokenModel = require('./models/csrf-token');
const { SHA256 } = require('sha2');

const RandomBytes = Util.promisify(Crypto.randomBytes);

async function GenerateToken(User) {
    const Bytes = await RandomBytes(16);
    const Token = Bytes.toString('hex');

    TokenModel.create({
        hash: SHA256(Token),
        user: User
    });

    return Token;
}

async function ValidateToken(User, Token) {
    const DbObject = await TokenModel.findOneAndDelete({
        hash: SHA256(Token),
        user: User
    }).select('_id');

    return DbObject != null;
}

async function PurgeTokens(User) {
    await TokenModel.deleteMany({
        user: User
    });
}

module.exports = { GenerateToken, ValidateToken, PurgeTokens };
