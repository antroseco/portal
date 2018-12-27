const Crypto = require('crypto');
const Util = require('util');
const TokenModel = require('./models/token');

const RandomBytes = Util.promisify(Crypto.randomBytes);

async function GenerateToken(User) {
    const Bytes = await RandomBytes(16);
    const Token = Bytes.toString('hex');

    TokenModel.create({
        token: Token,
        user: User
    });

    return Token;
}

async function ValidateToken(User, Token) {
    const DbObject = await TokenModel.findOneAndDelete({
        token: Token,
        user: User
    }, {
            select: { _id: true }
        });

    return DbObject != null;
}

module.exports = { GenerateToken, ValidateToken };
