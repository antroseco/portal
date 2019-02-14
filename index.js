const Koa = require('koa');
const Nunjucks = require('koa-nunjucks-next');
const KoaStatic = require('koa-static');
const KoaRouter = require('koa-router');
const KoaSession = require('koa-session');
const KoaBody = require('koa-body');
const KoaPassport = require('koa-passport');
const KoaHelmet = require('koa-helmet');
const LocalStrategy = require('passport-local').Strategy;
const RememberMeStrategy = require('koa-passport-remember-me').Strategy;
const KoaFlash = require('koa-better-flash');
const Auth = require('./auth');
const bcrypt = require('bcrypt');
const Laef = require('./laef');
const Protasis = require('./protasis');
const Kaay = require('./kaay');
const RenderEmailConfirmation = require('./email_confirmation');
const Validate = require('./validate');
const Mongoose = require('mongoose');
const UserModel = require('./models/user');
const MailQueue = require('./mailqueue');
const Token = require('./token');
const ResetModel = require('./models/password_reset');
const RenderResetPassword = require('./reset_password');
const Order = require('./order');
const Files = require('./files');
const Anakoinosis = require('./anakoinosis');
const Conditional = require('koa-conditional-get');
const ETag = require('koa-etag');
const Two_fa = require('./two_fa');
const ms = require('ms');
const log = require('./log');
const Session = require('./session');
const http2 = require('http2');
const fs = require('fs');

const App = new Koa();
const Router = new KoaRouter();

const DbURI = 'mongodb://localhost:27017/testdb';
Mongoose.connection.on('connected', () => log.info('Mongoose', 'Connected to', DbURI));
Mongoose.connect(DbURI, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    family: 4
});

const ParseUrlEnc = KoaBody({
    multipart: false,
    urlencoded: true,
    text: false,
    json: false
});

const ParseMultipart = KoaBody({
    multipart: true,
    urlencoded: false,
    text: false,
    json: false,
    formidable: {
        maxFileSize: 10 * 1024 * 1024
    }
});

const ParseJson = KoaBody({
    multipart: false,
    urlencoded: false,
    text: false,
    json: true,
    jsonLimit: 128
});

const Mq = new MailQueue({
    host: 'smtp.ethereal.email',
    port: 587,
    pool: true,
    requireTLS: true,
    auth: {
        user: 'duydqmvx7l6nyvpg@ethereal.email',
        pass: 'fXXWHQ95jphZdWh8eW'
    },
    disableUrlAccess: true
    // TODO: consider disableFileAccess 
});

const CookieSettings = {
    httpOnly: true,
    signed: true,
    secure: true,
    sameSite: 'lax'
};

// TODO: Move function to a better place
async function SendConfirmEmail(User) {
    const ConfirmationToken = new Token();

    await UserModel.updateOne({ _id: User._id }, {
        email_token_hash: await ConfirmationToken.hash
    });

    Mq.Push({
        from: '"Fred Foo 👻" <foo@example.com>',
        to: User.email,
        subject: 'Επιβεβαίωση εγγραφής στη Ψηφιακή Πλατφόρμα της ΕΦ',
        html: await RenderEmailConfirmation({
            'onoma': User.onoma,
            'epitheto': User.epitheto,
            'email': User.email,
            'token': await ConfirmationToken.hex
        })
    });

    log.info('ConfirmEmail', 'Sent to', User.email);
}

App.use(KoaHelmet.frameguard({ action: 'deny' }));
App.use(KoaHelmet.noSniff());
App.use(KoaHelmet.xssFilter());
App.use(KoaHelmet.referrerPolicy({ policy: 'same-origin' }));

App.use(Conditional());
App.use(ETag());

App.keys = ['session-secret :)']; //TODO: Session Secret
App.use(KoaSession({
    key: 'session',
    maxAge: ms('20 m'),
    ...CookieSettings,
    renew: true,
    store: Session.Store
}, App));

App.use(KoaFlash());

KoaPassport.serializeUser(Auth.Serialize);
KoaPassport.deserializeUser(Auth.Deserialize);

KoaPassport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, Auth.Strategy));

KoaPassport.use('rememberme', new RememberMeStrategy({
    cookie: CookieSettings
}, Auth.ValidateRemember, Auth.Remember));

App.use(Nunjucks({
    noCache: true,
    filters: {
        TitlosPeriodikou: n => {
            /*
            * #1 released June 2003,
            * #2 a year later
            * Up to #24 were issued every 3 months
            * The rest were issued every 6 months
            */
            if (n == 1) {
                return 'Τεύχος 1<br>Ιούνιος 2003';
            } else if (n < 25) {
                const Year = 2004 + Math.floor((n - 1) / 4);
                const Month = ['Μάρτιος', 'Ιούνιος', 'Σεπτέμβριος', 'Δεκέμβριος'][(n - 1) % 4];

                return `Τεύχος ${n}<br>${Month} ${Year}`;

            } else {
                const Year = 2010 + Math.floor((n - 25) / 2);
                const Month = n % 2 ? 'Ιούνιος' : 'Δεκέμβριος';

                return `Τεύχος ${n}<br>${Month} ${Year}`;
            }
        }
    }
}));

// Publicly available
App.use(KoaStatic('static', {
    maxAge: ms('4 hours'),
    defer: true,
    gzip: false,
    br: false
}));

App.use(KoaPassport.initialize());
App.use(KoaPassport.session());

App.use(log.attach);
App.use(async (ctx, next) => {
    ctx.state.Mq = Mq;

    // Initialize new sessions
    if (ctx.session.isNew) {
        const CsrfToken = new Token();
        ctx.session.csrf = await CsrfToken.hex;
    }

    await next();
});

Router.post('/api/login', ParseUrlEnc, Auth.CheckCsrf, KoaPassport.authenticate('local', {
    failureRedirect: '/',
    failureFlash: 'Invalid username or password combination'
}), async ctx => {
    /*
    * Destroy the session to protect
    * against session fixation attacks.
    */
    delete ctx.session.two_fa;
    await Session.RegenerateId(ctx);

    if (Validate.Checkbox(ctx.request.body.remember_me)) {
        ctx.cookies.set('remember_me',
            await Auth.Remember(ctx.state.user), {
                maxAge: 604800000,
                ...CookieSettings
            });
    } else {
        // Clear any existing cookies
        ctx.cookies.set('remember_me', null);
        ctx.cookies.set('remember_me.sig', null);
    }

    if (ctx.state.user.two_fa_enabled)
        ctx.redirect('/2fa/login');
    else
        ctx.redirect('/home');
});

// TODO: Refactor
Router.post('/api/register', ParseUrlEnc, Auth.CheckCsrf, async ctx => {
    const body = ctx.request.body;

    try {
        body.email = Validate.Email(body.email);
    } catch (_) {
        ctx.flash('error', 'Invalid email address');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    try {
        body.password = Validate.Password(body.password);
    } catch (_) {
        ctx.flash('error', 'Your password must be at least 8 characters long');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    try {
        body.onoma = Validate.Name(body.onoma);
    } catch (_) {
        ctx.flash('error', 'Name must not contain any special characters');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    try {
        body.epitheto = Validate.Name(body.epitheto);
    } catch (_) {
        ctx.flash('error', 'Surname must not contain any special characters');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    try {
        body.am = Validate.AM(body.am);
    } catch (_) {
        ctx.flash('error', 'Invalid AM');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    try {
        body.kinito = Validate.Kinito(body.kinito);
    } catch (Err) {
        ctx.flash('error', 'Invalid phone number');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    try {
        const User = await UserModel.create({
            email: body.email,
            password: await bcrypt.hash(body.password, 10),
            onoma: body.onoma,
            epitheto: body.epitheto,
            am: body.am,
            kinito: body.kinito
        });

        ctx.info('Register', 'User', User.email, 'registered');

        await SendConfirmEmail(User);

        await ctx.login(User);
        ctx.redirect('/welcome');
    } catch (Err) {
        if (Err.code == 11000) {
            ctx.flash('error', 'This email address is already in use');
            ctx.session.register = true;
            return ctx.redirect('/');
        } else {
            ctx.error('Register', Err);

            ctx.status = 500;
        }
    }
});

Router.use(KoaPassport.authenticate('rememberme'));

Router.get('/', async ctx => {
    if (ctx.isAuthenticated()) {
        ctx.redirect('/home');
    } else {
        await ctx.render('landing', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ',
            'error': ctx.flash('error'),
            'success': ctx.flash('success'),
            'csrf': ctx.session.csrf,
            'register': ctx.session.register
        });

        delete ctx.session.register;
    }
});

Router.post('/api/send_reset', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        const Email = Validate.Email(ctx.request.body.email);
        const User = await UserModel.findOne({ email: Email }).select('id');

        if (User != null) {
            const ResetToken = new Token();

            ResetModel.create({
                hash: await ResetToken.hash,
                user: User._id
            });

            Mq.Push({
                from: '"Fred Foo 👻" <foo@example.com>',
                to: Email,
                subject: 'Επαναφορά κωδικού πρόσβασης',
                //text: 'Plaintext body', TODO: plain text body
                html: await RenderResetPassword({
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
    });

Router.post('/api/reset_password', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        const body = ctx.request.body;
        const ResetToken = new Token(body.token);

        // Check password before consuming the reset token
        const Password = Validate.Password(body.password);

        const ResetEntry = await ResetModel.findOne({
            hash: await ResetToken.hash
        }).select('user');

        if (ResetEntry != null) {
            const User = await UserModel.findById(ResetEntry.user)
                .select('two_fa_enabled two_fa_secret email');

            if (User.two_fa_enabled) {
                try {
                    const two_fa_token = Validate.OTP(ctx.request.body.two_fa_token);
                    ctx.assert(Two_fa.Check(two_fa_token, User.two_fa_secret));
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
    });

Router.get('/reset_password', async ctx => {
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
});

// Require Authentication beyond this point
Router.use(async (ctx, next) => {
    if (ctx.isAuthenticated()) {
        await next();
    } else {
        ctx.flash('error', 'Your session has expired');
        ctx.redirect('/');
    }
});

Router.get('/2fa/login', Two_fa.RenderLogin);
Router.post('/api/2fa/login', ParseUrlEnc, Auth.CheckCsrf, Two_fa.SubmitLogin);

// TODO: We shouldn't use GET here
Router.get('/api/logout', async ctx => {
    delete ctx.session.two_fa;
    await Session.RegenerateId(ctx);

    ctx.cookies.set('remember_me', null);
    ctx.cookies.set('remember_me:sig', null);

    ctx.info('Logout', 'User', ctx.state.user.email, 'logged out');

    ctx.logout();
    ctx.flash('success', 'You have been logged out successfully')
    ctx.redirect('/');
});

// Enforce 2fa beyond this point
Router.use(async (ctx, next) => {
    if (ctx.state.user.two_fa_enabled
        && ctx.session.two_fa !== true)
        ctx.redirect('/2fa/login');
    else
        await next();
});

Router.get('/2fa/enable', Two_fa.RenderEnable);
Router.post('/api/2fa/enable', ParseUrlEnc, Auth.CheckCsrf, Two_fa.SubmitEnable);

Router.get('/2fa/verify', Two_fa.RenderVerify);
Router.post('/api/2fa/verify', ParseUrlEnc, Auth.CheckCsrf, Two_fa.SubmitVerify);
Router.post('/api/2fa/cancel', ParseUrlEnc, Auth.CheckCsrf, Two_fa.SubmitCancel);

Router.get('/2fa/disable', Two_fa.RenderDisable);
Router.post('/api/2fa/disable', ParseUrlEnc, Auth.CheckCsrf, Two_fa.SubmitDisable);

Router.get('/welcome', async ctx => {
    if (ctx.state.user.verified_email)
        ctx.redirect('/home');
    else
        await ctx.render('welcome', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Καλωσορίσατε',
            'onomateponymo': ctx.state.user.onomateponymo,
            'email': ctx.state.user.email,
            'success': ctx.flash('success'),
            'error': ctx.flash('error'),
            'csrf': ctx.session.csrf
        });
});

Router.post('/api/resend_confirm_email', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        if (ctx.state.user.verified_email) {
            ctx.status = 403;

            ctx.warn('Resend Confirm Email', 'Already verified user', ctx.state.user.email,
                'requested a new confirmation email');
        }
        else {
            await SendConfirmEmail(ctx.state.user);

            ctx.flash('success', 'Το email έχει σταλεί');
            ctx.redirect('/welcome');
        }
    });

Router.get('/confirm_email/:token', async ctx => {
    if (ctx.state.user.verified_email)
        ctx.redirect('/home');
    else
        await ctx.render('confirm_email', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Επιβεβαίωση Εγγραφής',
            'onomateponymo': ctx.state.user.onomateponymo,
            'email': ctx.state.user.email,
            'csrf': ctx.session.csrf
        });
});

Router.post('/confirm_email/:token', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
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
    });

// Require email confirmation beyond this point
Router.use(async (ctx, next) => {
    if (ctx.state.user.verified_email)
        await next();
    else
        ctx.redirect('/welcome');
});

Router.get('/home', async ctx => {
    await ctx.render('home', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Home',
        'current': 'home',
        'onomateponymo': ctx.state.user.onomateponymo,
        'success': ctx.flash('success'),
        'error': ctx.flash('error')
    });
});

Router.get('/logariasmos', async ctx => {
    await ctx.render('logariasmos', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Λογαριασμός',
        'current': 'logariasmos',
        'onomateponymo': ctx.state.user.onomateponymo,
        'email': ctx.state.user.email,
        'kinito': ctx.state.user.kinito,
        'am': ctx.state.user.am,
        'csrf': ctx.session.csrf,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'two_fa_enabled': ctx.state.user.two_fa_enabled
    });
});

Router.get('/change_password', async ctx => {
    await ctx.render('change_password', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Αλλαγή Κωδικού',
        'csrf': ctx.session.csrf,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'two_fa_enabled': ctx.state.user.two_fa_enabled
    });
});

Router.post('/api/change_password', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        try {
            const Old = Validate.Password(ctx.request.body.old_password);
            const New = Validate.Password(ctx.request.body.new_password);

            if (await Auth.VerifyPassword(Old, ctx.state.user._id)) {
                if (ctx.state.user.two_fa_enabled) {
                    try {
                        const two_fa_token = Validate.OTP(ctx.request.body.two_fa_token);
                        ctx.assert(Two_fa.Check(two_fa_token, ctx.state.user.two_fa_secret));
                    } catch (_) {
                        ctx.warn('Password Reset', 'A failed password change was attempted for user', ctx.state.user.email,
                            'with an invalid OTP token');
                        ctx.flash('error', 'Ο κωδικός επαλήθευσης που εισάγατε είναι λάθος');
                        return ctx.redirect('/change_password');
                    }
                }

                ctx.info('Change Password', 'User', ctx.state.user.email, 'updated his password');

                await UserModel.updateOne({ _id: ctx.state.user._id },
                    { password: await bcrypt.hash(New, 10) });

                ctx.flash('success', 'Ο κωδικός σας έχει αλλαχτεί');
                ctx.redirect('/logariasmos');
            } else {
                ctx.warn('Change Password', 'User', ctx.state.user.email,
                    'used an incorrect password while trying to update his password');

                ctx.flash('error', 'Ο κωδικός που εισάγατε είναι λανθασμένος');
                ctx.redirect('/change_password');
            }
        } catch (Err) {
            ctx.error('Change Password', 'User', ctx.state.user.email, Err);

            ctx.flash('error', 'Το αίτημά σας έχει αποτύχει');
            ctx.redirect('/change_password');
        }
    });

Router.get('/laef', Laef.RenderPage);
Router.post('/api/laef', ParseUrlEnc, Auth.CheckCsrf, Laef.Submit);

Router.get('/protasis', Protasis.RenderPage);
Router.post('/api/protasis', ParseUrlEnc, Auth.CheckCsrf, Protasis.Submit);

Router.get('/kaay', Kaay.RenderPage);
Router.post('/api/kaay', ParseUrlEnc, Auth.CheckCsrf, Kaay.Submit);

Router.get('/order', Order.RenderPage);
Router.post('/api/order', ParseUrlEnc, Auth.CheckCsrf, Order.Submit);

Router.get('/periodika', async ctx => {
    await ctx.render('periodika', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Περιοδικά ΔΙΕΦ',
        'onomateponymo': ctx.state.user.onomateponymo,
    });
});

Router.post('/api/upload', async (ctx, next) => {
    try {
        ctx.info('Upload', 'User', ctx.state.user.email,
            'uploaded a file');
        // Catch Formidable erorrs
        await next();
        // Save file and return a 'token'
        ctx.body = await Files.Register(ctx.request.files.file);
        ctx.status = 201;
    } catch (Err) {
        ctx.error('Upload', 'User', ctx.state.user.email, Err);

        ctx.status = Err.status ? Err.status : 400;
    }
}, ParseMultipart, Auth.CheckCsrf);

Router.get('/anakoinosis', Anakoinosis.RenderPage);
Router.get('/anakoinosis/:category', Anakoinosis.RenderCategory);
Router.put('/api/anakoinosis/read', ParseJson, Auth.CheckCsrf, Anakoinosis.MarkRead);

App.use(Router.routes());
App.use(Router.allowedMethods());

require('./enforce_tls').listen(8000);

http2.createSecureServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    minVersion: 'TLSv1.2',
    allowHTTP1: true
}, App.callback()).listen(8443, () =>
    log.info('HTTPS', 'Listening on localhost:8443'));
