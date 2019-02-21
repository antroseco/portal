const ResetModel = require('./models/password_reset');
const UserModel = require('./models/user');
const Token = require('./token');
const Validate = require('./validate');
const bcrypt = require('bcrypt');
const Two_fa = require('./two_fa');
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

async function RenderPage(ctx) {
    const ResetToken = new Token(ctx.query.token);

    const ResetEntry = await ResetModel.findOne({
        hash: await ResetToken.hash
    }).select('user');

    if (ResetEntry != null) {
        const User = await UserModel.findById(ResetEntry.user)
            .select('two_fa_enabled');

        await ctx.render('reset_password', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Επαναφορά Κωδικού',
            'success': ctx.flash('success'),
            'error': ctx.flash('error'),
            'token': await ResetToken.hex,
            'csrf': ctx.session.csrf,
            'two_fa_enabled': User.two_fa_enabled
        });
    } else {
        ctx.flash('error', 'Ο σύνδεσμος έχει λήξει');
        ctx.redirect('/');
    }
}

function RenderEmail(Extra) {
    return Nunjucks.render('reset_password.html', Extra);
}

async function SubmitSend(ctx) {
    const Email = Validate.Email(ctx.request.body.email);
    const User = await UserModel.findOne({ email: Email }).select('id');

    if (User != null) {
        const ResetToken = new Token();

        ResetModel.create({
            hash: await ResetToken.hash,
            user: User._id
        });

        ctx.state.Mq.Push({
            from: '"Fred Foo 👻" <foo@example.com>',
            to: Email,
            subject: 'Επαναφορά κωδικού πρόσβασης',
            //text: 'Plaintext body', TODO: plain text body
            html: await RenderEmail({
                email: Email,
                token: await ResetToken.hex
            })
        });

        ctx.info('Password Reset', 'A password reset has been requested for user', Email);
    } else {
        ctx.warn('Password Reset', 'A password reset has been requested for unknown user', Email);
    }

    ctx.flash('success', 'Έχει σταλεί email για επαναφορά κωδικού')
    ctx.redirect('/');
}

async function SubmitReset(ctx) {
    const body = ctx.request.body;
    const ResetToken = new Token(body.token);

    // Check password before consuming the reset token
    const Password = Validate.Password(body.password);

    const ResetEntry = await ResetModel.findOne({
        hash: await ResetToken.hash
    }).select('user');

    if (ResetEntry != null) {
        // lean(false) because Two_fa.Check() calls User.save()
        const User = await UserModel.findById(ResetEntry.user).lean(false)
            .select('two_fa_enabled two_fa_secret two_fa_recovery_codes email');

        if (User.two_fa_enabled) {
            try {
                const two_fa_token = Validate.OTP(ctx.request.body.two_fa_token);
                ctx.assert(await Two_fa.Check(User, two_fa_token));
            } catch (_) {
                ctx.warn('Password Reset', 'A failed password reset was attempted for user', User.email,
                    'with an invalid OTP token');
                ctx.flash('error', 'Ο κωδικός επαλήθευσης που εισάγατε είναι λάθος');
                return ctx.redirect('back');
            }
        }

        User.password = await bcrypt.hash(Password, 10);
        await Promise.all([User.save(),
        ResetModel.deleteOne({ _id: ResetEntry._id })]);

        ctx.info('Password Reset', 'A password reset has been completed for user', User.email);
        ctx.flash('success', 'Ο κωδικός σας έχει αλλαχτεί');
    } else {
        ctx.warn('Password Reset', 'A failed password reset was attempted with token',
            await ResetToken.hex);
        ctx.flash('error', 'Το αίτημά σας έχει αποτύχει');
    }

    ctx.redirect('/');
}

module.exports = { RenderPage, SubmitSend, SubmitReset };
