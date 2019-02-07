const bcrypt = require('bcrypt');
const UserModel = require('./models/user');
const SessionModel = require('./models/session');
const RememberModel = require('./models/remember_me');
const Token = require('./token');
const log = require('./log');
const Validate = require('./validate');

// Called once on user login
async function Serialize(User, done) {
    const CsrfToken = new Token();
    const SessionToken = new Token();

    await SessionModel.create({
        csrf: await CsrfToken.hex,
        session_hash: await SessionToken.hash,
        user: User._id
    });

    done(null, await SessionToken.hex);
}

// Called on every authenticated request
async function Deserialize(SessionHex, done) {
    try {
        if (typeof SessionHex !== 'string')
            return done(null, false);

        const SessionToken = new Token(SessionHex);
        const Session = await SessionModel.findOne({
            session_hash: await SessionToken.hash
        }).lean(false);

        if (!Session) {
            log.warn('Deserialize', 'Request used an expired session',
                await SessionToken.hex);

            done(null, false);
        } else {
            const User = await UserModel.findById(Session.user).lean(false);
            User.session = Session;

            done(null, User);
        }
    } catch (Err) {
        log.error('Deserialize', Err);

        done(Err);
    }
}

async function DestroySession(Session) {
    return await SessionModel.deleteOne({
        _id: Session._id
    });
}

async function DestoryCsrf(CsrfToken) {
    return await SessionModel.deleteOne({
        csrf: CsrfToken
    });
}

async function Strategy(Username, Password, done) {
    try {
        Username = Validate.Email(Username);
        Password = Validate.Password(Password);
    } catch (Err) {
        log.warn('Login', 'Invalid credentials supplied');
        return done(null, false);
    }

    try {
        const User = await UserModel.findOne({
            email: Username
        }).select('password two_fa_enabled');

        if (User && await bcrypt.compare(Password, User.password)) {
            log.info('Login', 'User', Username, 'logged in');
            return done(null, User);
        } else {
            log.warn('Login', 'Failed login attempt for user', Username);
            return done(null, false);
        }
    } catch (Err) {
        log.error('Strategy', Err);
        return done(Err);
    }
}

async function GetCsrf(User) {
    if (User) {
        return User.session.csrf;
    } else {
        const CsrfToken = new Token();

        await SessionModel.create({
            csrf: await CsrfToken.hex
        });

        return await CsrfToken.hex;
    }
}

async function CheckCsrf(ctx, next) {
    try {
        var Csrf = new Token(ctx.request.body.csrf);
        var User = ctx.state.user;

        const Session = await SessionModel.findOne({
            csrf: await Csrf.hex,
            user: User ? User._id : undefined
        }).select('_id');

        ctx.assert(Session);
    } catch (Err) {
        log.warn('Check Csrf', 'User', User ? User.email : undefined,
            'used an invalid CSRF token', Csrf ? await Csrf.hex : undefined);

        ctx.throw(401);
    }

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

        await RememberModel.create({
            hash: await RememberToken.hash,
            user: User._id
        });

        if (done)
            done(null, await RememberToken.hex);
        else
            return await RememberToken.hex;
    } catch (Err) {
        log.error('Remember', Err);

        if (done)
            done(Err);
        else
            throw Err;
    }
}

async function ValidateRemember(RememberHex, done) {
    try {
        const RememberToken = new Token(RememberHex);

        const Remember = await RememberModel.findOneAndDelete({
            hash: await RememberToken.hash
        }).select('user');

        if (Remember) {
            const User = await UserModel.findById(Remember.user);
            log.info('Validate Remember', 'User', User.email, 'logged in using a remember token');
            done(null, User);
        } else {
            log.warn('Validate Remember', 'Invalid remember token was used', await RememberToken.hex);
            done(null, false);
        }
    } catch (Err) {
        log.error('Validate Remember', Err);

        done(Err);
    }
}

module.exports = {
    Serialize, Deserialize, DestroySession, DestoryCsrf, Strategy,
    GetCsrf, CheckCsrf, VerifyPassword, Remember, ValidateRemember
};
