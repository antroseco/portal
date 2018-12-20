const Validate = require("./validate.js");
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

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

function ValidatePost(body) {
    const Output = {};

    Output['One'] = Validate.Custom(body.erotisi1, Erotisi1);

    Output['TwoA'] = Validate.Number(body.erotisi2a, 1, 5);
    Output['TwoB'] = Validate.Number(body.erotisi2b, 1, 5);
    Output['TwoC'] = Validate.Number(body.erotisi2c, 1, 5);
    Output['TwoD'] = Validate.Number(body.erotisi2d, 1, 5);
    Output['TwoE'] = Validate.Number(body.erotisi2e, 1, 5);
    Output['TwoF'] = Validate.Number(body.erotisi2f, 1, 5);
    Output['TwoG'] = Validate.Number(body.erotisi2g, 1, 5);
    Output['TwoH'] = Validate.Number(body.erotisi2h, 1, 5);

    Output['Three'] = Validate.Boolean(body.erotisi3);
    Output['Four'] = Validate.Boolean(body.erotisi4);
    Output['Five'] = Validate.Boolean(body.erotisi5);

    Output['SixA'] = Validate.Number(body.erotisi6a, 1, 5);
    Output['SixB'] = Validate.Number(body.erotisi6b, 1, 5);
    Output['SixC'] = Validate.Number(body.erotisi6c, 1, 5);
    Output['SixD'] = Validate.Number(body.erotisi6d, 1, 5);
    Output['SixE'] = Validate.Number(body.erotisi6e, 1, 5);

    Output['Seven'] = Validate.Text(body.erotisi7, 1024);

    Output['Eight'] = Validate.Custom(body.erotisi8, Erotisi8);

    Output['Nine'] = Validate.Text(body.erotisi9, 1024);

    Output['TenA'] = Validate.Custom(body.erotisi10a, Erotisi10a);
    Output['TenB'] = Validate.Custom(body.erotisi10b, Erotisi10b);
    Output['TenC'] = Validate.Custom(body.erotisi10c, Erotisi10c);

    return Output;
};

module.exports = body => {
    const PostData = ValidatePost(body);

    return Nunjucks.render('laef.html', PostData);
}
