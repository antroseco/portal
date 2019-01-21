const Validate = require("./validate");
const Auth = require('./auth');
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

// TODO: Use Arrays instead of Maps
const Erotisi1 = new Map([['imera', 'Κάθε ημέρα'],
['evdomada', '2-3 φορές την εβδομάδα'], ['mina', '2-3 φορές τον μήνα'],
['pote', 'Ποτέ']]);

const Erotisi8 = new Map([['katholou', 'Καθόλου ικανοποιημένος/η'],
['metria', 'Μέτρια ικανοποιημένος/η'], ['poli', 'Πολύ ικανοποιημένος/η'],
['apolita', 'Απόλυτα ικανοποιημένος/η']]);

const Erotisi10a = new Map([['andras', 'Άνδρας'],
['ginaika', 'Γυναίκα']]);

const Erotisi10b = new Map([['18-30', '18 - 30'],
['31-40', '31 - 40'], ['41-50', '41 - 50'],
['50+', '50 +']]);

const Erotisi10c = new Map([['eggamos', 'Έγγαμος/η'],
['agamos', 'Άγαμος/η'], ['allo', 'Άλλο']]);

async function RenderPage(ctx) {
    await ctx.render('laef', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Αξιολόγηση ΛΑΕΦ',
        'onomateponymo': ctx.state.user.onomateponymo,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'csrf': await Auth.GetCsrf(ctx.state.user)
    });
}

function RenderEmail(Body) {
    const PostData = {
        'One': Validate.Custom(Body.erotisi1, Erotisi1),
        'TwoA': Validate.Number(Body.erotisi2a, 1, 5),
        'TwoB': Validate.Number(Body.erotisi2b, 1, 5),
        'TwoC': Validate.Number(Body.erotisi2c, 1, 5),
        'TwoD': Validate.Number(Body.erotisi2d, 1, 5),
        'TwoE': Validate.Number(Body.erotisi2e, 1, 5),
        'TwoF': Validate.Number(Body.erotisi2f, 1, 5),
        'TwoG': Validate.Number(Body.erotisi2g, 1, 5),
        'TwoH': Validate.Number(Body.erotisi2h, 1, 5),

        'Three': Validate.Boolean(Body.erotisi3),
        'Four': Validate.Boolean(Body.erotisi4),
        'Five': Validate.Boolean(Body.erotisi5),

        'SixA': Validate.Number(Body.erotisi6a, 1, 5),
        'SixB': Validate.Number(Body.erotisi6b, 1, 5),
        'SixC': Validate.Number(Body.erotisi6c, 1, 5),
        'SixD': Validate.Number(Body.erotisi6d, 1, 5),
        'SixE': Validate.Number(Body.erotisi6e, 1, 5),

        'Seven': Validate.Text(Body.erotisi7, 1024),

        'Eight': Validate.Custom(Body.erotisi8, Erotisi8),

        'Nine': Validate.Text(Body.erotisi9, 1024),

        'TenA': Validate.Custom(Body.erotisi10a, Erotisi10a),
        'TenB': Validate.Custom(Body.erotisi10b, Erotisi10b),
        'TenC': Validate.Custom(Body.erotisi10c, Erotisi10c)
    };

    return Nunjucks.render('laef.html', PostData);
}

function Submit(ctx) {
    try {
        ctx.state.Mq.Push({
            from: '"Fred Foo 👻" <foo@example.com>',
            to: 'bar@example.com, baz@example.com',
            subject: 'Αναφορά Αξιολόγησης ΛΑΕΦ',
            //text: 'Plaintext body', TODO: plain text body
            html: RenderEmail(ctx.request.body)
        });

        ctx.flash('success', 'Ευχαριστούμε, η αξιολόγηση σας έχει σταλεί');
    } catch (Err) {
        console.log(Err);

        ctx.flash('error', 'Η αποστολή της αξιολόγησής σας έχει αποτύχει');
    } finally {
        ctx.redirect('/laef');
    }
}

module.exports = { RenderPage, Submit };
