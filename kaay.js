const Validate = require("./validate");
const Auth = require('./auth');
const Path = require('path');
const Os = require('os');
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
}).addFilter('Letter', n => String.fromCharCode('α'.charCodeAt() + n));

const Proelevsi = ['Ε/Κ', 'Ε/Ε'];

const Katigoria = ['Αξκός', 'Ανθστής', 'Υπξκός', 'Απόστρατος'];

const Oikogeniaki = ['Έγγαμος', 'Άγαμος', 'Άλλο'];

async function RenderPage(ctx) {
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
}

function ValidatePost(Body) {
    const Output = {
        onomapatera: Validate.Text(Body.onomapatera, 35),
        proelevsi: Validate.Array(Body.proelevsi, Proelevsi),
        katigoria: Validate.Array(Body.katigoria, Katigoria),
        os: Validate.Array(Body.os, Validate.Common.OS),
        vathmos: Validate.Array(Body.vathmos, Validate.Common.Vathmos),
        monada: Validate.Text(Body.monada, 32),
        oikias: Validate.Phone(Body.oikias),
        ipiresias: Validate.Phone(Body.ipiresias),
        oikogeniaki: Validate.Array(Body.oikogeniaki, Oikogeniaki),
        arithmosmelon: Validate.Number(Body.arithmosmelon, 1, 20),
        arithmosteknon: Validate.Number(Body.arithmosteknon, 0, 6),
        diefthinsi: Validate.Text(Body.diefthinsi, 100),
        poli: Validate.Text(Body.poli, 32),
        tk: Validate.Number(Body.tk, 1000, 9999),
        protimisi1: Validate.Number(Body.protimisi1, 1, 4),
        protimisi2: Validate.Number(Body.protimisi2, 1, 4),
        ilikies: [],
        sira: [],
        exoterikou: []
    };

    if (Output.proelevsi == 'Ε/Ε')
        Output.imerominia = Validate.Date(Body.imerominia);

    if (Output.oikogeniaki == 'Έγγαμος') {
        Output.sizigos = Validate.Text(Body.sizigos, 100);
        Output.monadasizigou = Validate.Text(Body.monadasizigou, 32);
    }

    for (let i = 1; i < 7; ++i) {
        const Value = Body[`ilikia${i}`];

        if (!Value)
            break;

        Output.ilikies.push(Validate.Number(Value, 0, 99));
    }

    for (let i = 1; i < 6; ++i) {
        const Year = `sira${i}year`;
        const Sira = `sira${i}sira`;

        if (!Body[Year] || !Body[Sira])
            break;

        Output.sira.push([
            Validate.Number(Body[Year], 1900, 2100),
            Validate.Number(Body[Sira], 1, 4)]);
    }

    for (let i = 1; i < 6; ++i) {
        const Year = `exoterikou${i}year`;
        const Xora = `exoterikou${i}xora`;

        if (!Body[Year] || !Body[Xora])
            break;

        Output.exoterikou.push([
            Validate.Number(Body[Year], 1900, 2100),
            Validate.Text(Body[Xora], 64)]);
    }

    return Output;
};

function RenderEmail(Body, Extra) {
    const PostData = ValidatePost(Body);

    return Nunjucks.render('kaay.html', { ...PostData, ...Extra });
}

function Submit(ctx) {
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

        ctx.state.Mq.Push({
            from: '"Fred Foo 👻" <foo@example.com>',
            to: 'bar@example.com, baz@example.com',
            subject: 'Αναφορά Αίτησης Παραθερισμού στο ΚΑΑΥ Κυτίου',
            html: RenderEmail(body, {
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
}

module.exports = { RenderPage, Submit };
