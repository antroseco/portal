const Koa = require('koa');
const Nunjucks = require('koa-nunjucks-next');
const KoaStatic = require('koa-static');
const KoaRouter = require('koa-router');
const KoaSession = require('koa-session');
const KoaBody = require('koa-body');
const KoaPassport = require('koa-passport');
const LocalStrategy = require('passport-local').Strategy;
const KoaFlash = require('koa-better-flash');
const Auth = require('./auth.js');
const bcrypt = require('bcrypt');
const NodeMailer = require('nodemailer');
const RenderLaef = require('./laef.js');
const RenderProtasis = require('./protasis.js');
const RenderKaay = require('./kaay.js');
const Validate = require('./validate.js');
const Os = require('os');
const Path = require('path');
const fs = require('fs').promises;
const Mongoose = require('mongoose');
const UserModel = require('./models/user.js');

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

const EmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const PasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,72}$/;
const NameRegex = /^[\wΑ-Ωάέόώίύή ,.'-]{1,32}$/;

const Mx = NodeMailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    requireTLS: true,
    auth: {
        user: 'duydqmvx7l6nyvpg@ethereal.email',
        pass: 'fXXWHQ95jphZdWh8eW'
    }
});

App.keys = ['session-secret :)']; //TODO: Session Secret
App.use(KoaSession({}, App));

App.use(KoaFlash());

KoaPassport.serializeUser(Auth.Serialize);
KoaPassport.deserializeUser(Auth.Deserialize);
KoaPassport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, Auth.Strategy));

App.use(KoaPassport.initialize());
App.use(KoaPassport.session());

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
                let Year = 2004 + Math.floor((n - 1) / 4);
                let Month = ['Μάρτιος', 'Ιούνιος', 'Σεπτέμβριος', 'Δεκέμβριος'][(n - 1) % 4];

                return `Τεύχος ${n}<br>${Month} ${Year}`;

            } else {
                let Year = 2010 + Math.floor((n - 25) / 2);
                let Month = n % 2 ? 'Ιούνιος' : 'Δεκέμβριος';

                return `Τεύχος ${n}<br>${Month} ${Year}`;
            }
        }
    }
}));

// Publicly available
App.use(KoaStatic('static'));

Router.post('/api/login', ParseUrlEnc, KoaPassport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/',
    failureFlash: 'Invalid username or password combination'
}));

Router.post('/api/register', ParseUrlEnc, async ctx => {
    // TODO: Check if email exists
    const body = ctx.request.body;

    // Email must be string, maximum length 320 characters, validate using regex
    if (typeof body.email !== 'string' || body.email.length > 320 || !EmailRegex.test(body.email)) {
        ctx.flash('error', 'Invalid email address');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    // Password must be a string, between 8 and 72 characters long,
    // contain one lower case, one upper case, and one special character
    if (typeof body.password !== 'string' || !PasswordRegex.test(body.password)) {
        ctx.flash('error', 'Password must be at least 8 characters long, and contain at least one lower case letter, upper case letter, and a special character');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    // Name and surname must be a string, between 1 and 32 characters,
    // and contain no special charactes
    if (typeof body.onoma !== 'string' || !NameRegex.test(body.onoma)) {
        ctx.flash('error', 'Name must not contain any special characters');
        ctx.session.register = true;
        return ctx.redirect('/');
    }

    if (typeof body.epitheto !== 'string' || !NameRegex.test(body.epitheto)) {
        ctx.flash('error', 'Surame must not contain any special characters');
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

    const User = await UserModel.create({
        email: body.email,
        password: await bcrypt.hash(body.password, 10),
        onoma: body.onoma,
        epitheto: body.epitheto,
        kinito: body.kinito,
    });

    await ctx.login(User);
    ctx.redirect('/home');
});

Router.get('/', async ctx => {
    await ctx.render('landing', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ',
        'error': ctx.flash('error'),
        'success': ctx.flash('success'),
        'register': ctx.session.register
    });

    ctx.session.register = false;
});

// Require Authentication beyond this point
Router.use(async (ctx, next) => {
    if (ctx.isUnauthenticated())
        ctx.throw(401);

    await next();
});

Router.get('/api/logout', async ctx => {
    ctx.logout();
    ctx.flash('success', 'You have been logged out successfully')
    ctx.redirect('/');
});

Router.get('/home', async ctx => {
    await ctx.render('home', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Home',
        'onomateponymo': ctx.state.user.onomateponymo
    });
});

Router.get('/laef', async ctx => {
    await ctx.render('laef', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Αξιολόγηση ΛΑΕΦ',
        'onomateponymo': ctx.state.user.onomateponymo,
        'success': ctx.flash('success'),
        'error': ctx.flash('error')
    });
});

Router.post('/api/laef', ParseUrlEnc,
    async ctx => {
        try {
            const MailOptions = {
                from: '"Fred Foo 👻" <foo@example.com>',
                to: 'bar@example.com, baz@example.com',
                subject: 'Αναφορά Αξιολόγησης ΛΑΕΦ',
                //text: 'Plaintext body', TODO: plain text body
                html: await RenderLaef(ctx.request.body)
            };

            Mx.sendMail(MailOptions, (Err, Info) => {
                if (Err) console.log(Err);

                //TODO: error handling
                console.log('Message sent: %s', Info.messageId);
                console.log('Preview URL: %s', NodeMailer.getTestMessageUrl(Info));
            });

            ctx.flash('success', 'Ευχαριστούμε, η αξιολόγηση σας έχει σταλεί');
        } catch (Err) {
            console.log(Err);

            ctx.flash('error', 'Η αποστολή της αξιολόγησής σας έχει αποτύχει');
        } finally {
            ctx.redirect('/laef');
        }
    });

Router.get('/protasis', async ctx => {
    await ctx.render('protasis', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Υποβολή Προτάσεων',
        'onomateponymo': ctx.state.user.onomateponymo,
        'onoma': ctx.state.user.onoma,
        'epitheto': ctx.state.user.epitheto,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'date': new Date().toISOString().substring(0, 10),
        'email': ctx.state.user.email,
        'kinito': ctx.state.user.kinito
    });
});

Router.post('/api/protasis', ParseUrlEnc,
    async ctx => {
        try {
            const MailOptions = {
                from: '"Fred Foo 👻" <foo@example.com>',
                to: 'bar@example.com, baz@example.com',
                subject: 'Αναφορά Υποβολής Πρότασης',
                html: await RenderProtasis(ctx.request.body, {
                    'date': new Date().toISOString().substring(0, 10),
                    'onomateponymo': ctx.state.user.onomateponymo,
                    'email': ctx.state.user.email,
                    'kinito': ctx.state.user.kinito
                })
            };

            Mx.sendMail(MailOptions, (Err, Info) => {
                if (Err) console.log(Err);
                //TODO: error handling
                console.log('Message sent: %s', Info.messageId);
                console.log('Preview URL: %s', NodeMailer.getTestMessageUrl(Info));
            });

            ctx.flash('success', 'Ευχαριστούμε, η πρότασή σας έχει σταλεί');
        } catch (Err) {
            console.log(Err);

            ctx.flash('error', 'Η αποστολή της πρότασής σας έχει αποτύχει');
        } finally {
            ctx.redirect('/protasis');
        }
    });

Router.get('/kaay', async ctx => {
    await ctx.render('kaay', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Υποβολή Προτάσεων',
        'onomateponymo': ctx.state.user.onomateponymo,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'date': new Date().toISOString().substring(0, 10),
        'email': ctx.state.user.email,
        'kinito': ctx.state.user.kinito
    });
});

Router.post('/api/kaay', ParseUrlEnc,
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

            const MailOptions = {
                from: '"Fred Foo 👻" <foo@example.com>',
                to: 'bar@example.com, baz@example.com',
                subject: 'Αναφορά Αίτησης Παραθερισμού στο ΚΑΑΥ Κυτίου',
                html: await RenderKaay(body, {
                    'onoma': ctx.state.user.onoma,
                    'epitheto': ctx.state.user.epitheto,
                    'kinito': ctx.state.user.kinito
                }),
                attachments: Attachments
            };

            // TODO: determine if we need await
            await Mx.sendMail(MailOptions, (Err, Info) => {
                if (Err) console.log(Err);
                //TODO: error handling
                console.log('Message sent: %s', Info.messageId);
                console.log('Preview URL: %s', NodeMailer.getTestMessageUrl(Info));

                // Clean-up uploaded attatchments
                for (const Attachment of Attachments) {
                    console.log('deleting ', Attachment.path);
                    fs.unlink(Attachment.path);
                }
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

Router.put('/api/upload', async (ctx, next) => {
    try {
        // Catch Formidable erorrs
        await next();
        // Save file and return a 'token'
        ctx.body = ctx.request.files.file.path.substr(-32);
        ctx.status = 200;
    } catch (Err) {
        console.log(Err);
        ctx.status = 400;
    }
}, ParseMultipart);

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
