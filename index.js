const Koa = require('koa');
const Nunjucks = require('koa-nunjucks-next');
const KoaStatic = require('koa-static');
const KoaRouter = require('koa-router');
const KoaSession = require('koa-session');
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
const ConfirmEmail = require('./confirm_email');
const Validate = require('./validate');
const Mongoose = require('mongoose');
const UserModel = require('./models/user');
const MailQueue = require('./mailqueue');
const Token = require('./token');
const ResetPassword = require('./reset_password');
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
const Parse = require('./parse');

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

// TODO: Name 'local' is uneccessary (Strategies expose this.name)
KoaPassport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
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

Router.post('/api/login', Parse.UrlEnc, Auth.CheckCsrf, KoaPassport.authenticate('local', {
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

Router.post('/api/register', Parse.UrlEnc, Auth.CheckCsrf, async ctx => {
    const body = ctx.request.body;

    try {
        const User = await UserModel.create({
            email: Validate.Email(body.email),
            password: await bcrypt.hash(Validate.Password(body.password), 10),
            onoma: Validate.Name(body.onoma),
            epitheto: Validate.Name(body.epitheto),
            am: Validate.AM(body.am),
            kinito: Validate.Kinito(body.kinito)
        });

        ctx.info('Register', 'User', User.email, 'registered');

        await ConfirmEmail.SendEmail(ctx, User);

        await ctx.login(User);
        ctx.redirect('/welcome');
    } catch (Err) {
        if (Err instanceof Validate.Error) {
            ctx.flash('error', Err.message);
            ctx.session.register = true;
            ctx.redirect('/');
        } else if (Err.code == 11000) {
            ctx.flash('error', 'This email address is already in use');
            ctx.session.register = true;
            ctx.redirect('/');
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

Router.get('/reset_password', ResetPassword.RenderPage);
Router.post('/api/send_reset', Parse.UrlEnc, Auth.CheckCsrf, ResetPassword.SubmitSend);
Router.post('/api/reset_password', Parse.UrlEnc, Auth.CheckCsrf, ResetPassword.SubmitReset);

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
Router.post('/api/2fa/login', Parse.UrlEnc, Auth.CheckCsrf, Two_fa.SubmitLogin);

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
Router.post('/2fa/recovery_codes', Parse.UrlEnc, Auth.CheckCsrf, Two_fa.SubmitEnable);

Router.get('/2fa/verify', Two_fa.RenderVerify);
Router.post('/api/2fa/verify', Parse.UrlEnc, Auth.CheckCsrf, Two_fa.SubmitVerify);
Router.post('/api/2fa/cancel', Parse.UrlEnc, Auth.CheckCsrf, Two_fa.SubmitCancel);

Router.get('/2fa/disable', Two_fa.RenderDisable);
Router.post('/api/2fa/disable', Parse.UrlEnc, Auth.CheckCsrf, Two_fa.SubmitDisable);

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

Router.get('/confirm_email/:token', ConfirmEmail.RenderPage);
Router.post('/confirm_email/:token', Parse.UrlEnc, Auth.CheckCsrf, ConfirmEmail.SubmitConfirm);
Router.post('/api/resend_confirm_email', Parse.UrlEnc, Auth.CheckCsrf, ConfirmEmail.SubmitResend);

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

Router.post('/api/change_password', Parse.UrlEnc, Auth.CheckCsrf,
    async ctx => {
        try {
            const Old = Validate.Password(ctx.request.body.old_password);
            const New = Validate.Password(ctx.request.body.new_password);

            if (await Auth.VerifyPassword(Old, ctx.state.user._id)) {
                if (ctx.state.user.two_fa_enabled
                    && await Two_fa.Check(ctx.state.user, ctx.request.body.two_fa_token) == false) {
                    ctx.warn('Password Reset', 'A failed password change was attempted for user',
                        ctx.state.user.email, 'with an invalid OTP token');
                    ctx.flash('error', 'Ο κωδικός επαλήθευσης που εισάγατε είναι λάθος');
                    return ctx.redirect('/change_password');
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
            if (Err instanceof Validate.Error) {
                ctx.flash('error', Err.message);
            } else {
                ctx.flash('error', 'Το αίτημά σας έχει αποτύχει');
                ctx.error('Change Password', 'User', ctx.state.user.email, Err);
            }

            ctx.redirect('/change_password');
        }
    });

Router.get('/laef', Laef.RenderPage);
Router.post('/api/laef', Parse.UrlEnc, Auth.CheckCsrf, Laef.Submit);

Router.get('/protasis', Protasis.RenderPage);
Router.post('/api/protasis', Parse.UrlEnc, Auth.CheckCsrf, Protasis.Submit);

Router.get('/kaay', Kaay.RenderPage);
Router.post('/api/kaay', Parse.UrlEnc, Auth.CheckCsrf, Kaay.Submit);

Router.get('/order', Order.RenderPage);
Router.post('/api/order', Parse.UrlEnc, Auth.CheckCsrf, Order.Submit);

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
}, Parse.Multipart, Auth.CheckCsrf);

Router.get('/anakoinosis', Anakoinosis.RenderPage);
Router.get('/anakoinosis/:category', Anakoinosis.RenderCategory);
Router.put('/api/anakoinosis/read', Parse.Json, Auth.CheckCsrf, Anakoinosis.MarkRead);

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
