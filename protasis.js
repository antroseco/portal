const Validate = require('./validate');
const Auth = require('./auth');
const DateCache = require('./date_cache');
const log = require('./log');
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

async function RenderPage(ctx) {
    await ctx.render('protasis', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Υποβολή Προτάσεων',
        'onomateponymo': ctx.state.user.onomateponymo,
        'onoma': ctx.state.user.onoma,
        'epitheto': ctx.state.user.epitheto,
        'am': ctx.state.user.am,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'csrf': await Auth.GetCsrf(ctx.state.user),
        'date': DateCache.LocalString(),
        'email': ctx.state.user.email,
        'kinito': ctx.state.user.kinito
    });
}

function RenderEmail(Body, Extra) {
    const PostData = {
        'monada': Validate.Text(Body.monada, 16),
        'vathmos': Validate.Array(Body.vathmos, Validate.Common.Vathmos),
        'os': Validate.Array(Body.os, Validate.Common.OS),
        'thema': Validate.Text(Body.thema, 200),
        'paratirisis': Validate.Text(Body.paratirisis, 10000)
    };

    return Nunjucks.render('protasis.html', { ...PostData, ...Extra });
}

function Submit(ctx) {
    try {
        ctx.state.Mq.Push({
            from: '"Fred Foo 👻" <foo@example.com>',
            to: 'bar@example.com, baz@example.com',
            subject: 'Αναφορά Υποβολής Πρότασης',
            html: RenderEmail(ctx.request.body, {
                'date': DateCache.LocalString(),
                'onomateponymo': ctx.state.user.onomateponymo,
                'email': ctx.state.user.email,
                'am': ctx.state.user.am,
                'kinito': ctx.state.user.kinito
            })
        });

        log.info('Protasis', 'User', ctx.state.user.email, 'submited a form');
        ctx.flash('success', 'Ευχαριστούμε, η πρότασή σας έχει σταλεί');
    } catch (Err) {
        log.error('Protasis', 'User', ctx.state.user.email, Err);
        ctx.flash('error', 'Η αποστολή της πρότασής σας έχει αποτύχει');
    } finally {
        ctx.redirect('/protasis');
    }
}

module.exports = { RenderPage, Submit };
