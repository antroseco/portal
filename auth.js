const bcrypt = require('bcrypt');
const UserModel = require('./models/user');
const SessionModel = require('./models/session');
const RememberModel = require('./models/remember_me');
const Token = require('./token');

// Called once on user login
async function Serialize(User, done) {
    console.log('CALLED SERIALIZE', User, done);
    const CsrfToken = new Token();
    const SessionToken = new Token();

    await SessionModel.create({
        csrf: await CsrfToken.hex,
        session_hash: await SessionToken.hash,
        user: User._id
    });

    console.log('SERIALIZE', await SessionToken.hex);
    done(null, await SessionToken.hex);
}

// Called on every authenticated request
async function Deserialize(SessionHex, done) {
    try {
        console.log('CALLED DESERIALIZE', SessionHex, done);

        if (typeof SessionHex !== 'string')
            return done(null, false);

        const SessionToken = new Token(SessionHex);
        const Session = await SessionModel.findOne({
            session_hash: await SessionToken.hash
        }).select('user');

        if (!Session) {
            // TODO: Log
            console.log('DESERIALIZE NULL SESSION');
            done(null, false);
        } else {
            const User = await UserModel.findById(Session.user).lean(false);
            User.session_hash = await SessionToken.hash;

            console.log('DESERIALIZE OK', User.toJSON({ virtuals: true }));
            done(null, User);
        }
    } catch (Err) {
        console.log(Err);

        done(Err);
    }
}

async function DestroySession(SessionHash) {
    console.log('CALLED DESTROYSESSION', SessionHash);

    return await SessionModel.deleteOne({
        session_hash: SessionHash
    });
}

async function DestoryCsrf(CsrfToken) {
    console.log('CALLED DESTROYCSRF', CsrfToken);

    return await SessionModel.deleteOne({
        csrf: CsrfToken
    });
}

async function Strategy(Username, Password, done) {
    try {
        console.log('CALLED STRATEGY', Username, Password, done);

        const User = await UserModel.findOne({ email: Username }).select('password');

        if (User && await bcrypt.compare(Password, User.password))
            done(null, User);
        else
            done(null, false);
    } catch (Err) {
        console.log('STRATEGY ERROR', Err);

        done(Err);
    }
}

async function GetCsrf(User) {
    console.log('CALLED GETCSRF', User);

    if (User) {
        const Session = await SessionModel.findOne({
            session_hash: User.session_hash
        }).select('csrf');

        console.log(Session.csrf);

        return Session.csrf;
    } else {
        const CsrfToken = new Token();

        await SessionModel.create({
            csrf: await CsrfToken.hex
        });

        return await CsrfToken.hex;
    }
}

async function CheckCsrf(ctx, next) {
    console.log('CALLED CHECKCSRF', ctx.request.body);

    const Csrf = new Token(ctx.request.body.csrf);
    const User = ctx.state.user;

    const Session = await SessionModel.findOne({
        csrf: await Csrf.hex,
        user: User ? User._id : undefined
    }).select('_id');

    console.log('CHECKCSRF', Session);

    // TODO: Log
    ctx.assert(Session, 401);

    await next();
}

async function VerifyPassword(Data, _id) {
    const User = await UserModel.findById(_id).select('password');

    if (User.password != null)
        return bcrypt.compare(Data, User.password);

    return false;
}

async function Remember(User, done) {
    try {
        const RememberToken = new Token();
        console.log('CALLED REMEMBER', User);

        await RememberModel.create({
            hash: await RememberToken.hash,
            user: User._id
        });

        if (done)
            done(null, await RememberToken.hex);
        else
            return await RememberToken.hex;
    } catch (Err) {
        console.log('REMEMBER ERROR', Err);

        if (done)
            done(Err);
        else
            throw Err;
    }
}

async function ValidateRemember(RememberHex, done) {
    try {
        console.log('CALLED VALIDATEREMEMBER', RememberHex);

        const RememberToken = new Token(RememberHex);

        const Remember = await RememberModel.findOneAndDelete({
            hash: await RememberToken.hash
        }).select('user');

        done(null, Remember ? await UserModel.findById(Remember.user) : false);
    } catch (Err) {
        console.log('VALIDATEREMEMBER ERROR', Err);

        done(Err);
    }
}

module.exports = {
    Serialize, Deserialize, DestroySession, DestoryCsrf, Strategy,
    GetCsrf, CheckCsrf, VerifyPassword, Remember, ValidateRemember
};
