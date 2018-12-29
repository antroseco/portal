const Validate = require("./validate.js");
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

function ValidatePost(body) {
    const Output = {};

    Output['monada'] = Validate.Text(body.monada, 16);
    Output['vathmos'] = Validate.Array(body.vathmos, Validate.Common.Vathmos);
    Output['os'] = Validate.Array(body.os, Validate.Common.OS);
    Output['thema'] = Validate.Text(body.thema, 200);
    Output['paratirisis'] = Validate.Text(body.paratirisis, 10000);

    return Output;
};

module.exports = (Body, Extra) => {
    const PostData = ValidatePost(Body);

    return Nunjucks.render('protasis.html', { ...PostData, ...Extra });
}
