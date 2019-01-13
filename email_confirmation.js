const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

module.exports = Extra =>
    Nunjucks.render('email_confirmation.html', Extra)
