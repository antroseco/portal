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
const RenderLaef = require('./laef');
const Protasis = require('./protasis');
const RenderKaay = require('./kaay');
const RenderEmailConfirmation = require('./email_confirmation');
const Validate = require('./validate');
const Os = require('os');
const Path = require('path');
const fs = require('fs').promises;
const Mongoose = require('mongoose');
const UserModel = require('./models/user');
const MailQueue = require('./mailqueue');
const Token = require('./token');
const ResetModel = require('./models/password_reset');
const RenderResetPassword = require('./reset_password');

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
    json: false
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

App.use(KoaHelmet.frameguard({ action: 'deny' }));
App.use(KoaHelmet.noSniff());
App.use(KoaHelmet.xssFilter());
App.use(KoaHelmet.referrerPolicy({ policy: 'same-origin' }));

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
App.use(KoaStatic('static'));

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
        const ConfirmationToken = new Token();

        const User = await UserModel.create({
            email: body.email,
            email_token_hash: await ConfirmationToken.hash,
            password: await bcrypt.hash(body.password, 10),
            onoma: body.onoma,
            epitheto: body.epitheto,
            am: body.am,
            kinito: body.kinito
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

        await ctx.login(User);
        ctx.redirect('/confirm_email');
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

Router.get('/confirm_email', async ctx => {
    if (ctx.state.user.verified_email)
        ctx.redirect('/home');
    else
        await ctx.render('confirm_email', {
            'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Επιβεβαίωση Εγγραφής',
            'onomateponymo': ctx.state.user.onomateponymo,
            'email': ctx.state.user.email,
            'error': ctx.flash('error'),
            'csrf': await Auth.GetCsrf(ctx.state.user)
        });
});

// TODO: GET is not a very good idea
Router.get('/confirm_email/:token', async ctx => {
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
            console.log('CONFIRM_EMAIL/TOKEN FAILURE')
        }

        // TODO: if we redirect to /home then won't we go to /confirm_token?
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
        ctx.redirect('/confirm_email');
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

Router.get('/laef', async ctx => {
    await ctx.render('laef', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Αξιολόγηση ΛΑΕΦ',
        'onomateponymo': ctx.state.user.onomateponymo,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'csrf': await Auth.GetCsrf(ctx.state.user)
    });
});

Router.post('/api/laef', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        try {
            Mq.Push({
                from: '"Fred Foo 👻" <foo@example.com>',
                to: 'bar@example.com, baz@example.com',
                subject: 'Αναφορά Αξιολόγησης ΛΑΕΦ',
                //text: 'Plaintext body', TODO: plain text body
                html: await RenderLaef(ctx.request.body)
            });

            ctx.flash('success', 'Ευχαριστούμε, η αξιολόγηση σας έχει σταλεί');
        } catch (Err) {
            console.log(Err);

            ctx.flash('error', 'Η αποστολή της αξιολόγησής σας έχει αποτύχει');
        } finally {
            ctx.redirect('/laef');
        }
    });

Router.get('/protasis', Protasis.RenderPage);
Router.post('/api/protasis', ParseUrlEnc, Auth.CheckCsrf, Protasis.Submit);

Router.get('/kaay', async ctx => {
    await ctx.render('kaay', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Υποβολή Προτάσεων',
        'onomateponymo': ctx.state.user.onomateponymo,
        'onoma': ctx.state.user.onoma,
        'epitheto': ctx.state.user.epitheto,
        'am': ctx.state.user.am,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'csrf': await Auth.GetCsrf(ctx.state.user),
        'date': new Date().toISOString().substring(0, 10),
        'email': ctx.state.user.email,
        'kinito': ctx.state.user.kinito
    });
});

Router.post('/api/kaay', ParseUrlEnc, Auth.CheckCsrf,
    async ctx => {
        try {
            let Attachments = [];

            const body = ctx.request.body;

            // TODO: Protect against XSS maybe
            if (body.file1 != '' && body.filename1 != '') {
                Attachments.push({
                    filename: Validate.Filename(body.filename1),
                    path: Path.join(Os.tmpdir(), 'upload_' + Validate.FileToken(body.file1))
                });
            }
            if (body.file2 != '' && body.filename2 != '') {
                Attachments.push({
                    filename: Validate.Filename(body.filename2),
                    path: Path.join(Os.tmpdir(), 'upload_' + Validate.FileToken(body.file2))
                });
            }

            console.log(Attachments);

            Mq.Push({
                from: '"Fred Foo 👻" <foo@example.com>',
                to: 'bar@example.com, baz@example.com',
                subject: 'Αναφορά Αίτησης Παραθερισμού στο ΚΑΑΥ Κυτίου',
                html: await RenderKaay(body, {
                    'onoma': ctx.state.user.onoma,
                    'epitheto': ctx.state.user.epitheto,
                    'am': ctx.state.user.am,
                    'kinito': ctx.state.user.kinito
                }),
                attachments: Attachments
            });

            ctx.flash('success', 'Ευχαριστούμε, η αίτησή σας έχει σταλεί');
        } catch (Err) {
            console.log(Err);
            // TODO: Clean up already uploaded attachments, probably create a File API
            ctx.flash('error', 'Η αποστολή της αίτησής σας έχει αποτύχει');
        } finally {
            ctx.redirect('/kaay');
        }
    });

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
        ctx.body = ctx.request.files.file.path.substr(-32);
        ctx.status = 201;
    } catch (Err) {
        console.log(Err);
        ctx.status = Err.status ? Err.status : 400;
    }
}, ParseMultipart, Auth.CheckCsrf);

async function ResolveDirectory(Path, n = 0) {
    const Result = await fs.readdir(Path, {
        encoding: 'utf-8',
        withFileTypes: true
    });

    return Result.filter(Dirent => Dirent.isFile())
        .map(Dirent => Dirent.name).sort().splice(-n).reverse();
}

Router.get('/anakoinosis', async ctx => {
    await ctx.render('anakoinosis', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Ανακοινώσεις',
        'onomateponymo': ctx.state.user.onomateponymo,
        'read': ctx.state.user.anakoinosis,
        'anakoinosis': await ResolveDirectory('./views/anakoinosis/anakoinosis', 3),
        'prosfores_ef': await ResolveDirectory('./views/anakoinosis/prosfores-ef', 3),
        'prosfores_triton': await ResolveDirectory('./views/anakoinosis/prosfores-triton', 3)
    });
});

Router.get('/anakoinosis/:category', async ctx => {
    const Options = {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Ανακοινώσεις',
        'onomateponymo': ctx.state.user.onomateponymo,
        'read': ctx.state.user.anakoinosis
    };

    switch (ctx.params.category) {
        case 'anakoinosis':
            Options.directory = './anakoinosis/anakoinosis/';
            break;
        case 'prosfores-ef':
            Options.directory = './anakoinosis/prosfores-ef/';
            break;
        case 'prosfores-triton':
            Options.directory = './anakoinosis/prosfores-triton/';
            break;
        default:
            return ctx.status = 404;
    }

    Options.posts = await ResolveDirectory(Path.join('./views', Options.directory));

    await ctx.render('anakoinosis_perissotera', Options);
});

// TODO: Auth.CheckCsrf here and regenerate tokens on each request
Router.put('/api/anakoinosis/read', async (ctx, next) => {
    try {
        await next();
        const body = JSON.parse(ctx.request.body); // TODO: validate
        console.log('PUT /api/anakoinosis/read', body);

        ctx.state.user.anakoinosis.set(body.read, true);
        await ctx.state.user.save();

        ctx.status = 200;
    } catch (Err) {
        console.log(Err);
    }
}, KoaBody()); // todo

App.use(Router.routes());
App.use(Router.allowedMethods());

App.listen(8000, () => console.log('Listening on localhost:8000'));
