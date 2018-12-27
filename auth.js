const bcrypt = require('bcrypt');
const UserModel = require('./models/user');
const Crypto = require('crypto');
const Util = require('util');
const TokenModel = require('./models/login-token');
const { SHA256 } = require('sha2');

const RandomBytes = Util.promisify(Crypto.randomBytes);

function Serialize(User, done) {
    done(null, User._id);
};

async function Deserialize(Id, done) {
    try {
        const User = await UserModel.findById(Id).lean(false);

        done(null, User);
    } catch (Err) {
        console.log(Err);

        done(Err);
    }
};

async function Strategy(Username, Password, done) {
    try {
        const User = await UserModel.findOne({ email: Username },
            { password: true });

        if (User && await bcrypt.compare(Password, User.password)) {
            /*
            * We won't use the user object for anything else
            * so only provide the _id field to allow the
            * serialization of the user
            */
            done(null, { _id: User._id });
        }
        else {
            done(null, false);
        }
    } catch (Err) {
        console.log(Err);

        done(Err);
    }
};

async function GenerateToken(User, done) {
    try {
        const Bytes = await RandomBytes(16);
        const Token = Bytes.toString('hex');

        await TokenModel.create({
            hash: SHA256(Token).toString('hex'),
            user: User
        });

        if (done)
            done(null, Token);
        else
            return Token;
    } catch (Err) {
        if (done)
            done(Err);
        else
            throw Err;
    }
}

async function ValidateToken(Token, done) {
    try {
        const DbResponse = await TokenModel.findOneAndDelete({
            hash: SHA256(Token).toString('hex'),
        }, {
                select: { user: true }
            });

        if (DbResponse)
            done(null, await UserModel.findById(DbResponse.user));
        else
            done(null, false);
    } catch (Err) {
        done(Err);
    }
}

async function PurgeTokens(User) {
    await TokenModel.deleteMany({
        user: User
    });
}

module.exports = { Serialize, Deserialize, Strategy, GenerateToken, ValidateToken, PurgeTokens };
