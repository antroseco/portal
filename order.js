const Validate = require('./validate');
const Auth = require('./auth');
const DateCache = require('./date_cache');
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

async function RenderPage(ctx) {
    await ctx.render('order', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Υποβολή Προτάσεων',
        'onomateponymo': ctx.state.user.onomateponymo,
        'onoma': ctx.state.user.onoma,
        'epitheto': ctx.state.user.epitheto,
        'am': ctx.state.user.am,
        'success': ctx.flash('success'),
        'error': ctx.flash('error'),
        'csrf': ctx.session.csrf,
        'kinito': ctx.state.user.kinito,
        'date_min': DateCache.LocalString(),
        'date_max': DateCache.LocalString(7)
    });
}

function RenderEmail(Body, Extra) {
    const PostData = {
        'imerominia': Validate.Date(Body.imerominia, DateCache.Date(), DateCache.Date(7)),
        'epilogi': Validate.Array(Body.epilogi, Validate.Common.Epilogi),
        'paratirisis': Validate.Text(Body.paratirisis, 2000)
    };

    return Nunjucks.render('order.html', { ...PostData, ...Extra });
}

function Submit(ctx) {
    try {
        ctx.state.Mq.Push({
            from: '"Fred Foo 👻" <foo@example.com>',
            to: 'bar@example.com, baz@example.com',
            subject: 'Αναφορά Παραγγελίας Συσσιτίου',
            html: RenderEmail(ctx.request.body, {
                'onomateponymo': ctx.state.user.onomateponymo,
                'am': ctx.state.user.am,
                'kinito': ctx.state.user.kinito
            })
        });

        ctx.info('Order', 'User', ctx.state.user.email, 'submited an order');
        ctx.flash('success', 'Ευχαριστούμε, η παραγγελία σας έχει σταλεί');
    } catch (Err) {
        ctx.error('Order', 'User', ctx.state.user.email, Err);
        ctx.flash('error', 'Η αποστολή της παραγγελίας σας έχει αποτύχει');
    } finally {
        ctx.redirect('/order');
    }
}

module.exports = { RenderPage, Submit };
