const Validate = require("./validate.js");
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
}).addFilter('Letter', n => String.fromCharCode('α'.charCodeAt() + n));

const Proelevsi = ['Ε/Κ', 'Ε/Ε'];

const Katigoria = ['Αξκός', 'Ανθστής', 'Υπξκός', 'Απόστρατος'];

const Oikogeniaki = ['Έγγαμος', 'Άγαμος', 'Άλλο'];

function ValidatePost(body) {
    const Output = {
        onomapatera: Validate.Text(body.onomapatera, 35),
        proelevsi: Validate.Array(body.proelevsi, Proelevsi),
        katigoria: Validate.Array(body.katigoria, Katigoria),
        os: Validate.Array(body.os, Validate.Common.OS),
        vathmos: Validate.Array(body.vathmos, Validate.Common.Vathmos),
        monada: Validate.Text(body.monada, 32),
        oikias: Validate.Phone(body.oikias),
        ipiresias: Validate.Phone(body.ipiresias),
        oikogeniaki: Validate.Array(body.oikogeniaki, Oikogeniaki),
        arithmosmelon: Validate.Number(body.arithmosmelon, 1, 20),
        arithmosteknon: Validate.Number(body.arithmosteknon, 0, 6),
        diefthinsi: Validate.Text(body.diefthinsi, 100),
        poli: Validate.Text(body.poli, 32),
        tk: Validate.Number(body.tk, 1000, 9999),
        protimisi1: Validate.Number(body.protimisi1, 1, 4),
        protimisi2: Validate.Number(body.protimisi2, 1, 4),
        ilikies: [],
        sira: [],
        exoterikou: []
    };

    if (Output.proelevsi == 'Ε/Ε')
        Output.imerominia = Validate.Date(body.imerominia);

    if (Output.oikogeniaki == 'Έγγαμος') {
        Output.sizigos = Validate.Text(body.sizigos, 100);
        Output.monadasizigou = Validate.Text(body.monadasizigou, 32);
    }

    for (let i = 1; i < 7; ++i) {
        const Value = body[`ilikia${i}`];

        if (!Value)
            break;

        Output.ilikies.push(Validate.Number(Value, 0, 99));
    }

    for (let i = 1; i < 6; ++i) {
        const Year = `sira${i}year`;
        const Sira = `sira${i}sira`;

        if (!body[Year] || !body[Sira])
            break;

        Output.sira.push([
            Validate.Number(body[Year], 1900, 2100),
            Validate.Number(body[Sira], 1, 4)]);
    }

    for (let i = 1; i < 6; ++i) {
        const Year = `exoterikou${i}year`;
        const Xora = `exoterikou${i}xora`;

        if (!body[Year] || !body[Xora])
            break;

        Output.exoterikou.push([
            Validate.Number(body[Year], 1900, 2100),
            Validate.Text(body[Xora], 64)]);
    }

    return Output;
};

module.exports = (Body, Extra) => {
    const PostData = ValidatePost(Body);

    return Nunjucks.render('kaay.html', { ...PostData, ...Extra });
}
