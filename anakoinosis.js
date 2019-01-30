const Directory = require('./directory');

const Anakoinosis = new Directory('./views/anakoinosis/anakoinosis');
const ProsforesEf = new Directory('./views/anakoinosis/prosfores-ef');
const ProsforesTriton = new Directory('./views/anakoinosis/prosfores-triton');

async function RenderPage(ctx) {
    await ctx.render('anakoinosis', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Ανακοινώσεις',
        'onomateponymo': ctx.state.user.onomateponymo,
        'read': ctx.state.user.anakoinosis,
        'anakoinosis': await Anakoinosis.Get(3),
        'prosfores_ef': await ProsforesEf.Get(3),
        'prosfores_triton': await ProsforesTriton.Get(3)
    });
}

async function RenderCategory(ctx) {
    const Options = {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Ανακοινώσεις',
        'onomateponymo': ctx.state.user.onomateponymo,
        'read': ctx.state.user.anakoinosis
    };

    // TODO: Consider using a Map
    switch (ctx.params.category) {
        case 'anakoinosis':
            Options.directory = './anakoinosis/anakoinosis/';
            Options.posts = await Anakoinosis.Get();
            break;
        case 'prosfores-ef':
            Options.directory = './anakoinosis/prosfores-ef/';
            Options.posts = await ProsforesEf.Get();
            break;
        case 'prosfores-triton':
            Options.directory = './anakoinosis/prosfores-triton/';
            Options.posts = await ProsforesTriton.Get();
            break;
        default:
            return ctx.status = 404;
    }

    await ctx.render('anakoinosis_perissotera', Options);
}

// TODO: Auth.CheckCsrf here
async function MarkRead(ctx, next) {
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
}

module.exports = { RenderPage, RenderCategory, MarkRead };
