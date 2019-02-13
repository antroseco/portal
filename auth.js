const bcrypt = require('bcrypt');
const UserModel = require('./models/user');
const RememberModel = require('./models/remember_me');
const Token = require('./token');
const log = require('./log');
const Validate = require('./validate');

// Called once on user login
function Serialize(User, done) {
    done(null, User._id);
}

// Called on every authenticated request
async function Deserialize(id, done) {
    try {
        if (!id)
            return done(null, false);

        const User = await UserModel.findById(id).lean(false);

        if (User) {
            done(null, User);
        } else {
            log.warn('Deserialize', 'Request used an expired session');
            done(null, false);
        }
    } catch (Err) {
        log.error('Deserialize', Err);

        done(Err);
    }
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

async function CheckCsrf(ctx, next) {
    try {
        var Csrf = new Token(ctx.request.body.csrf);
        var User = ctx.state.user;

        ctx.assert.strictEqual(ctx.session.csrf, await Csrf.hex);
    } catch (Err) {
        ctx.warn('Check Csrf', 'User', User ? User.email : undefined,
            'used an invalid CSRF token', Csrf ? await Csrf.hex : undefined);

        ctx.flash('error', 'Your session has expired');
        return ctx.redirect('/');
    }

    await next();
}

async function VerifyPassword(Data, _id) {
    const User = await UserModel.findById(_id).select('password');

    if (User)
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
    Serialize, Deserialize, Strategy, CheckCsrf,
    VerifyPassword, Remember, ValidateRemember
};
