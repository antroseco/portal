const UserModel = require('./models/user');
const Token = require('./token');
const log = require('./log');
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

async function RenderPage(ctx) {
    if (ctx.state.user.verified_email)
        ctx.redirect('/home');
    else
        await ctx.render('confirm_email', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Επιβεβαίωση Εγγραφής',
            'onomateponymo': ctx.state.user.onomateponymo,
            'email': ctx.state.user.email,
            'csrf': ctx.session.csrf
        });
}

// During registration, ctx.state.user is null
async function SendEmail(ctx, User = ctx.state.user) {
    const ConfirmationToken = new Token();

    User.email_token_hash = await ConfirmationToken.hash;
    await User.save();

    ctx.state.Mq.Push({
        from: '"Fred Foo 👻" <foo@example.com>',
        to: User.email,
        subject: 'Επιβεβαίωση εγγραφής στη Ψηφιακή Πλατφόρμα της ΕΦ',
        html: Nunjucks.render('email_confirmation.html', {
            'onoma': User.onoma,
            'epitheto': User.epitheto,
            'email': User.email,
            'token': await ConfirmationToken.hex
        })
    });

    log.info('ConfirmEmail', 'Sent to', User.email);
}

async function SubmitConfirm(ctx) {
    try {
        const user = ctx.state.user;
        const ConfirmationToken = new Token(ctx.params.token);

        if (user.email_token_hash.equals(await ConfirmationToken.hash)) {
            await UserModel.updateOne({ _id: user._id }, {
                $set: { verified_email: true },
                $unset: { email_token_hash: null }
            });

            ctx.flash('success', 'Το email σας έχει επαληθευτεί');
            ctx.redirect('/2fa/enable');

            ctx.info('Confirm Email', 'User', ctx.state.user.email, 'confirmed his email');
        } else {
            ctx.flash('error', 'Ο σύνδεσμος έχει λήξει');
            ctx.redirect('/welcome');

            ctx.warn('Confirm Email', 'User', ctx.state.user.email,
                'failed to confirm his email using token', await ConfirmationToken.hex);
        }
    } catch (Err) {
        ctx.error('Confirm Email', 'User', ctx.state.user.email, Err);

        ctx.status = 400;
    }
}

async function SubmitResend(ctx) {
    if (ctx.state.user.verified_email) {
        ctx.status = 403;

        ctx.warn('Resend Confirm Email', 'Already verified user', ctx.state.user.email,
            'requested a new confirmation email');
    } else {
        await SendEmail(ctx);

        ctx.flash('success', 'Το email έχει σταλεί');
        ctx.redirect('/welcome');
    }
}

module.exports = { RenderPage, SubmitConfirm, SubmitResend, SendEmail };
