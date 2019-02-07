const OTP = require('otplib').authenticator;
const Auth = require('./auth');
const Validate = require('./validate');
const log = require('./log');

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
            'csrf': await Auth.GetCsrf(ctx.state.user)
        });
}

async function SubmitEnable(ctx) {
    ctx.assert(!ctx.state.user.two_fa_secret, 403);

    ctx.state.user.two_fa_secret = OTP.generateSecret();
    await ctx.state.user.save();

    log.info('Enable 2fa', 'Generated 2fa secret for user', ctx.state.user.email);

    ctx.redirect('/2fa/verify');
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
            'csrf': await Auth.GetCsrf(ctx.state.user),
            'email': ctx.state.user.email,
            'secret': ctx.state.user.two_fa_secret
        });
}

async function SubmitVerify(ctx) {
    // Assert 2fa is not enabled, but a secret has been generated
    ctx.assert(!ctx.state.user.two_fa_enabled, 403);
    ctx.assert(ctx.state.user.two_fa_secret, 403);

    const Token = Validate.OTP(ctx.request.body.token);

    if (OTP.check(Token, ctx.state.user.two_fa_secret)) {
        ctx.state.user.two_fa_enabled = true;
        ctx.state.user.session.two_fa = true;

        await Promise.all([ctx.state.user.save(), ctx.state.user.session.save()]);

        log.info('Verify 2fa', 'User', ctx.state.user.email, 'succesfully enabled 2fa');

        ctx.flash('success', 'Το two-factor authentication έχει ενεργοποιηθεί');
        ctx.redirect('/home');
    } else {
        ctx.flash('error', 'Ο κωδικός που έχετε εισάγει είναι λάθος');
        ctx.redirect('/2fa/verify');
    }
}

async function SubmitCancel(ctx) {
    // Assert 2fa is not enabled, but a secret has been generated
    ctx.assert(!ctx.state.user.two_fa_enabled, 403);
    ctx.assert(ctx.state.user.two_fa_secret, 403);

    ctx.state.user.two_fa_secret = null;
    await ctx.state.user.save();

    log.info('Cancel 2fa', 'User', ctx.state.user.email, 'cancelled the 2fa setup process');

    ctx.redirect('/home');
}

async function RenderLogin(ctx) {
    // Assert the user has enabled 2fa and he has not been already verified
    if (!ctx.state.user.two_fa_enabled || ctx.state.user.session.two_fa)
        ctx.redirect('/home');
    else
        await ctx.render('login_2fa', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ',
            'error': ctx.flash('error'),
            'success': ctx.flash('success'),
            'csrf': await Auth.GetCsrf(ctx.state.user)
        });
}

async function SubmitLogin(ctx) {
    // Assert the user has enabled 2fa and he has not been already verified
    ctx.assert(ctx.state.user.two_fa_enabled, 403);
    ctx.assert(!ctx.state.user.session.two_fa, 403);

    const Token = Validate.OTP(ctx.request.body.token);
    if (OTP.check(Token, ctx.state.user.two_fa_secret)) {
        ctx.state.user.session.two_fa = true;
        await ctx.state.user.session.save();

        log.info('Login 2fa', 'User', ctx.state.user.email, 'authenticated using 2fa');
        ctx.redirect('/home')
    } else {
        log.warn('Login 2fa', 'User', ctx.state.user.email, 'failed to authenticate using 2fa');
        ctx.flash('error', 'Ο κωδικός που έχετε εισάγει είναι λάθος');
        ctx.redirect('/2fa/login');
    }
}

module.exports = {
    RenderEnable, SubmitEnable, RenderVerify,
    SubmitVerify, SubmitCancel, RenderLogin, SubmitLogin
};
