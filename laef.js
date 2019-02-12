const Validate = require('./validate');
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

const Erotisi1 = ['Κάθε ημέρα', '2-3 φορές την εβδομάδα', '2-3 φορές τον μήνα', 'Ποτέ'];
const Erotisi8 = ['Καθόλου ικανοποιημένος/η', 'Μέτρια ικανοποιημένος/η',
    'Πολύ ικανοποιημένος/η', 'Απόλυτα ικανοποιημένος/η'];
const Erotisi10a = ['Άνδρας', 'Γυναίκα'];
const Erotisi10b = ['18 - 30', '31 - 40', '41 - 50', '50 +'];
const Erotisi10c = ['Έγγαμος/η', 'Άγαμος/η', 'Άλλο'];

async function RenderPage(ctx) {
    await ctx.render('laef', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Αξιολόγηση ΛΑΕΦ',
        'onomateponymo': ctx.state.user.onomateponymo,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'csrf': ctx.session.csrf
    });
}

function RenderEmail(Body) {
    const PostData = {
        'One': Validate.Array(Body.erotisi1, Erotisi1),
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

        'Eight': Validate.Array(Body.erotisi8, Erotisi8),

        'Nine': Validate.Text(Body.erotisi9, 1024),

        'TenA': Validate.Array(Body.erotisi10a, Erotisi10a),
        'TenB': Validate.Array(Body.erotisi10b, Erotisi10b),
        'TenC': Validate.Array(Body.erotisi10c, Erotisi10c)
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

        ctx.info('LAEF', 'User', ctx.state.user.email, 'submited a form');
        ctx.flash('success', 'Ευχαριστούμε, η αξιολόγηση σας έχει σταλεί');
    } catch (Err) {
        ctx.info('LAEF', 'User', ctx.state.user.email, Err);
        ctx.flash('error', 'Η αποστολή της αξιολόγησής σας έχει αποτύχει');
    } finally {
        ctx.redirect('/laef');
    }
}

module.exports = { RenderPage, Submit };
