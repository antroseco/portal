const Directory = require('./directory');
const Validate = require('./validate');

const Anakoinosis = new Directory('./views/anakoinosis/anakoinosis');
const ProsforesEf = new Directory('./views/anakoinosis/prosfores-ef');
const ProsforesTriton = new Directory('./views/anakoinosis/prosfores-triton');

async function RenderPage(ctx) {
    await ctx.render('anakoinosis', {
        'title': 'Ψηφιακή Πλατφόρμα ΓΕΕΦ - Ανακοινώσεις',
        'onomateponymo': ctx.state.user.onomateponymo,
        'csrf': ctx.session.csrf,
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
        'csrf': ctx.session.csrf,
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

// TODO: If we use a Map, then provide the ...map directly to Math.max
async function Max() {
    return Math.max(await Anakoinosis.max, await ProsforesEf.max, await ProsforesTriton.max);
}

async function Min() {
    return Math.min(await Anakoinosis.min, await ProsforesEf.min, await ProsforesTriton.min);
}

async function MarkRead(ctx) {
    try {
        const Id = Validate.Number(ctx.request.body.id, await Min(), await Max());

        ctx.state.user.anakoinosis.set(Id, true);
        await ctx.state.user.save();

        ctx.status = 200;
    } catch (Err) {
        ctx.error('Mark Read', 'User', ctx.state.user.email, Err);

        ctx.status = 400;
    }
}

module.exports = { RenderPage, RenderCategory, MarkRead };
