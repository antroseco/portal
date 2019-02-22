const OTP = require('otplib').authenticator;
const Auth = require('./auth');
const Validate = require('./validate');
const Token = require('./token');

OTP.options.window = 1;

async function RenderEnable(ctx) {
    if (ctx.state.user.two_fa_enabled)
        ctx.redirect('/home');
    else if (ctx.state.user.two_fa_secret)
        ctx.redirect('/2fa/verify');
    else
        await ctx.render('enable_2fa', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Two-factor authentication',
            'error': ctx.flash('error'),
            'success': ctx.flash('success'),
            'csrf': ctx.session.csrf
        });
}

async function SubmitEnable(ctx) {
    ctx.assert(!ctx.state.user.two_fa_secret, 403);

    // ctx.state.user.save() is called in GenerateRecoveyCodes()
    ctx.state.user.two_fa_secret = OTP.generateSecret();
    const recovery_codes = await GenerateRecoveryCodes(ctx.state.user);

    ctx.info('Enable 2fa', 'Generated 2fa secret and recovery codes for user', ctx.state.user.email);

    ctx.status = 201;
    await ctx.render('2fa_recovery_codes', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Two-factor authentication',
        'error': ctx.flash('error'),
        'success': ctx.flash('success'),
        'csrf': ctx.session.csrf,
        'codes': recovery_codes
    });
}

async function RenderVerify(ctx) {
    if (ctx.state.user.two_fa_enabled)
        ctx.redirect('/home');
    else if (!ctx.state.user.two_fa_secret)
        ctx.redirect('/2fa/enable');
    else
        await ctx.render('verify_2fa', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Two-factor authentication',
            'error': ctx.flash('error'),
            'success': ctx.flash('success'),
            'csrf': ctx.session.csrf,
            'email': ctx.state.user.email,
            'secret': ctx.state.user.two_fa_secret
        });
}

async function SubmitVerify(ctx) {
    // Assert 2fa is not enabled, but a secret has been generated
    ctx.assert(!ctx.state.user.two_fa_enabled, 403);
    ctx.assert(ctx.state.user.two_fa_secret, 403);

    try {
        const token = Validate.OTP(ctx.request.body.token);

        // Do not use Check, we shouldn't accept recovery codes here
        if (OTP.check(token, ctx.state.user.two_fa_secret)) {
            ctx.state.user.two_fa_enabled = true;
            await ctx.state.user.save();

            ctx.session.two_fa = true;

            ctx.info('Verify 2fa', 'User', ctx.state.user.email, 'succesfully enabled 2fa');

            ctx.flash('success', 'Το two-factor authentication έχει ενεργοποιηθεί');
            ctx.redirect('/home');
        } else {
            ctx.flash('error', 'Ο κωδικός που έχετε εισάγει είναι λάθος');
            ctx.redirect('/2fa/verify');
        }
    } catch (Err) {
        if (Err instanceof Validate.Error) {
            ctx.flash('error', Err.message);
            ctx.redirect('/2fa/verify');
        } else {
            throw Err;
        }
    }
}

async function SubmitCancel(ctx) {
    // Assert 2fa is not enabled, but a secret has been generated
    ctx.assert(!ctx.state.user.two_fa_enabled, 403);
    ctx.assert(ctx.state.user.two_fa_secret, 403);

    await ctx.state.user.updateOne({
        $unset: {
            two_fa_secret: null,
            two_fa_recovery_codes: null
        }
    });

    ctx.info('Cancel 2fa', 'User', ctx.state.user.email, 'cancelled the 2fa setup process');

    ctx.redirect('/home');
}

async function RenderLogin(ctx) {
    // Assert the user has enabled 2fa and he has not been already verified
    if (!ctx.state.user.two_fa_enabled || ctx.session.two_fa)
        ctx.redirect('/home');
    else
        await ctx.render('login_2fa', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ',
            'error': ctx.flash('error'),
            'success': ctx.flash('success'),
            'csrf': ctx.session.csrf
        });
}

async function SubmitLogin(ctx) {
    // Assert the user has enabled 2fa and he has not been already verified
    ctx.assert(ctx.state.user.two_fa_enabled, 403);
    ctx.assert(!ctx.session.two_fa, 403);

    if (await Check(ctx.state.user, ctx.request.body.token)) {
        ctx.session.two_fa = true;

        ctx.info('Login 2fa', 'User', ctx.state.user.email, 'authenticated using 2fa');
        ctx.redirect('/home')
    } else {
        ctx.warn('Login 2fa', 'User', ctx.state.user.email, 'failed to authenticate using 2fa');
        ctx.flash('error', 'Ο κωδικός που έχετε εισάγει είναι λάθος');
        ctx.redirect('/2fa/login');
    }
}

async function RenderDisable(ctx) {
    // Assert the user has enabled 2fa
    if (ctx.state.user.two_fa_enabled == false)
        ctx.redirect('/home');
    else
        await ctx.render('disable_2fa', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Two-factor authentication',
            'error': ctx.flash('error'),
            'success': ctx.flash('success'),
            'csrf': ctx.session.csrf
        });
}

async function SubmitDisable(ctx) {
    // Assert the user has enabled 2fa and has already authenticated
    ctx.assert(ctx.state.user.two_fa_enabled, 403);
    ctx.assert(ctx.session.two_fa, 401);

    try {
        var Password = Validate.Password(ctx.request.body.password);
        var token = Validate.OTP(ctx.request.body.token);
    } catch (Err) {
        ctx.flash('error', Err.message);
        return ctx.redirect('/2fa/disable');
    }

    if (await Check(ctx.state.user, token)
        && Auth.VerifyPassword(Password, ctx.state.user._id)) {
        ctx.session.two_fa = false;
        await ctx.state.user.updateOne({
            $set: { two_fa_enabled: false },
            $unset: {
                two_fa_secret: null,
                two_fa_recovery_codes: null
            }
        });

        ctx.warn('Disable 2fa', 'User', ctx.state.user.email, 'disabled 2fa authentication');
        ctx.flash('success', 'Το two-factor authentication έχει απενεργοποιηθεί');
        ctx.redirect('/logariasmos');
    } else {
        ctx.warn('Disable 2fa', 'User', ctx.state.user.email, 'failed to disable 2fa authentication');
        ctx.flash('error', 'Τα στοιχεία που εισάγατε είναι λάθος');
        ctx.redirect('/2fa/disable');
    }
}

async function GenerateRecoveryCodes(User) {
    let Plain = [];
    let Hashed = [];

    for (let i = 0; i < 10; ++i) {
        const token = new Token();
        Plain.push(await token.hex);
        Hashed.push(await token.hash);
    }

    User.two_fa_recovery_codes = Hashed;
    await User.save();

    return Plain;
}

async function ConsumeRecoveryCode(User, otp) {
    // Object equality in JavaScript is annoying
    const Code = new Token(otp);
    const Plain = User.two_fa_recovery_codes.map(JSON.stringify);
    const Hash = await Code.hash;

    if (Plain.includes(JSON.stringify(Hash))) {
        User.two_fa_recovery_codes.pull(Hash.toJSON());
        await User.save();

        return true;
    } else {
        return false;
    }
}

async function Check(User, otp) {
    try {
        otp = Validate.OTP(otp);

        if (OTP.check(otp, User.two_fa_secret))
            return true;
    } catch (_) { }

    try {
        otp = Validate.RecoveryCode(otp);

        return await ConsumeRecoveryCode(User, otp);
    } catch (_) {
        return false;
    }
}

module.exports = {
    RenderEnable, SubmitEnable, RenderVerify,
    SubmitVerify, RenderLogin, SubmitLogin,
    SubmitCancel, RenderDisable, SubmitDisable, Check
};
