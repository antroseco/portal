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

const App = new Koa();
const Router = new KoaRouter();

const DbURI = 'mongodb://localhost:27017/testdb';
Mongoose.set('debug', true);
Mongoose.connection.on('connected', () => console.log(`Connected to ${DbURI}`));
Mongoose.connect(DbURI, {
    useNewUrlParser: true,
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
    maxAge: 'session',
    httpOnly: true,
    signed: true
}, App));

App.use(KoaFlash());

KoaPassport.serializeUser(Auth.Serialize);
KoaPassport.deserializeUser(Auth.Deserialize);

KoaPassport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, Auth.Strategy));

KoaPassport.use('rememberme', new RememberMeStrategy({
    cookie: { signed: true }
}, Auth.ValidateRemember, Auth.Remember));

App.use(Nunjucks({
    noCache: true,
    filters: {
        TitlosPeriodikou: n => {
            // #1 released June 2003,
            // #2 a year later
            // Up to #24 were issued every 3 months
            // The rest were issued every 6 moths
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
    maxAge: 4 * 60 * 60 * 1000, // 4 hours
    defer: true,
    gzip: false,
    br: false
}));

App.use(KoaPassport.initialize());
App.use(KoaPassport.session());

App.use(async (ctx, next) => {
    ctx.state.Mq = Mq;
    await next();
});

Router.post('/api/login', ParseUrlEnc, Auth.CheckCsrf, KoaPassport.authenticate('local', {
    failureRedirect: '/',
    failureFlash: 'Invalid username or password combination'
}), async ctx => {
    /*
    * Destroy the CSRF token used since a new
    * one has been generated with the new session.
    * If the same token would be used, we would be
    * vulnerable to session fixation attacks.
    */
    Auth.DestoryCsrf(ctx.request.body.csrf);

    if (Validate.Checkbox(ctx.request.body.remember_me)) {
        // TODO: Look into unifying cookie settings
        ctx.cookies.set('remember_me',
            await Auth.Remember(ctx.state.user), {
                maxAge: 604800000,
                signed: true,
                httpOnly: true
            });
    } else {
        // Clear any existing cookies
        ctx.cookies.set('remember_me', null);
        ctx.cookies.set('remember_me.sig', null);
    }

    ctx.redirect('/home');
});

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
        body.kinito = Validate.Phone(body.kinito);
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

        await SendConfirmEmail(User);

        await ctx.login(User);
        ctx.redirect('/welcome');
    } catch (Err) {
        if (Err.code == 11000) {
            ctx.flash('error', 'This email address is already in use');
            ctx.session.register = true;
            return ctx.redirect('/');
        } else {
            console.log('REGISTRATION ERROR', Err);

            throw Err;
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
            'csrf': await Auth.GetCsrf(ctx.state.user),
            'register': ctx.session.register
        });

        delete ctx.session.register;
    }
});

Router.post('/api/send_reset', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        console.log('SEND_RESET', ctx.request.body);

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
        } else {
            // TODO: Logging
            console.log('SEND_RESET INVALID EMAIL', Email);
        }

        ctx.flash('success', 'Έχει σταλεί email για επαναφορά κωδικού')
        ctx.redirect('/');
    });

Router.post('/api/reset_password', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        console.log('/API/RESET_PASSWORD', ctx.request.body);
        const body = ctx.request.body;
        const ResetToken = new Token(body.token);

        // Check password before consuming the reset token
        const Password = Validate.Password(body.password);

        const ResetEntry = await ResetModel.findOneAndDelete({
            hash: await ResetToken.hash
        }).select('user');

        console.log('GOT FROM DB', ResetEntry);
        if (ResetEntry != null) {
            await UserModel.findByIdAndUpdate(ResetEntry.user, {
                password: await bcrypt.hash(Password, 10)
            });

            ctx.flash('success', 'Ο κωδικός σας έχει αλλαχτεί');
        } else {
            ctx.flash('error', 'Το αίτημά σας έχει αποτύχει');
        }

        ctx.redirect('/');
    });

Router.get('/reset_password', async ctx => {
    const ResetToken = new Token(ctx.query.token);

    const ResetEntry = await ResetModel.findOne({
        hash: await ResetToken.hash
    }).select('_id');

    if (ResetEntry != null) {
        await ctx.render('reset_password', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Επαναφορά Κωδικού',
            'token': await ResetToken.hex,
            'csrf': await Auth.GetCsrf(ctx.state.user)
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

// TODO: We shouldn't use GET here
Router.get('/api/logout', async ctx => {
    await Auth.DestroySession(ctx.state.user.session_hash);
    ctx.cookies.set('remember_me', null);
    ctx.cookies.set('remember_me:sig', null);

    ctx.logout();
    ctx.flash('success', 'You have been logged out successfully')
    ctx.redirect('/');
});

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
            'csrf': await Auth.GetCsrf(ctx.state.user)
        });
});

Router.post('/api/resend_confirm_email', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        if (ctx.state.user.verified_email) {
            ctx.status = 403;
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
            'csrf': await Auth.GetCsrf(ctx.state.user)
        });
});

Router.post('/confirm_email/:token', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        try {
            const user = ctx.state.user;
            const ConfirmationToken = new Token(ctx.params.token);

            if (user.email_token_hash.equals(await ConfirmationToken.hash)) {
                console.log('CONFIRM_EMAIL/TOKEN SUCCESS')
                await UserModel.updateOne({ _id: user._id }, {
                    $set: { verified_email: true },
                    $unset: { email_token_hash: null }
                });

                ctx.flash('success', 'Το email σας έχει επαληθευτεί');
            } else {
                // TODO: LOG FAILURE DETAILS
                console.log('CONFIRM_EMAIL/TOKEN FAILURE');
                ctx.flash('error', 'Ο σύνδεσμος έχει λήξει');
            }

            // TODO: if we redirect to /home then won't we go to /welcome?
            ctx.redirect('/home');
        } catch (Err) {
            console.log('CONFIRM_EMAIL/TOKEN ERROR', Err);

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
        'csrf': await Auth.GetCsrf(ctx.state.user),
        'success': ctx.flash('success'),
        'error': ctx.flash('error')
    });
});

Router.post('/api/change_password', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        try {
            const Old = Validate.Password(ctx.request.body.old_password);
            const New = Validate.Password(ctx.request.body.new_password);

            if (await Auth.VerifyPassword(Old, ctx.state.user._id)) {
                console.log('UPDATING PASSWORD FOR USER', ctx.state.user._id);

                await UserModel.updateOne({ _id: ctx.state.user._id },
                    { password: await bcrypt.hash(New, 10) });

                ctx.flash('success', 'Ο κωδικός σας έχει αλλαχτεί');
            } else {
                ctx.flash('error', 'Ο κωδικός που εισάγατε είναι λανθασμένος');
            }
        } catch (Err) {
            console.log('/API/CHANGE_PASSWORD ERROR', Err);

            ctx.flash('error', 'Το αίτημά σας έχει αποτύχει');
        } finally {
            ctx.redirect('/logariasmos');
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
        // Catch Formidable erorrs
        await next();
        // Save file and return a 'token'
        ctx.body = await Files.Register(ctx.request.files.file);
        ctx.status = 201;
    } catch (Err) {
        console.log(Err);
        ctx.status = Err.status ? Err.status : 400;
    }
}, ParseMultipart, Auth.CheckCsrf);

Router.get('/anakoinosis', Anakoinosis.RenderPage);
Router.get('/anakoinosis/:category', Anakoinosis.RenderCategory);
Router.put('/api/anakoinosis/read', ParseJson, Auth.CheckCsrf, Anakoinosis.MarkRead);

App.use(Router.routes());
App.use(Router.allowedMethods());

App.listen(8000, () => console.log('Listening on localhost:8000'));
