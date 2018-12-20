const Validate = require("./validate.js");
const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

function ValidatePost(body) {
    const Output = {};

    Output['monada'] = Validate.Text(body.monada, 16);
    Output['vathmos'] = Validate.Text(body.vathmos, 16);
    Output['os'] = Validate.Text(body.os, 16);
    Output['thema'] = Validate.Text(body.thema, 200);
    Output['paratirisis'] = Validate.Text(body.paratirisis, 10000);

    return Output;
};

module.exports = (Body, Extra) => {
    console.log(Body);
    console.log(Extra);
    const PostData = ValidatePost(Body);

    return Nunjucks.render('protasis.html', { ...PostData, ...Extra });
}
