const Nunjucks = require('nunjucks').configure('emails', {
    noCache: true
});

module.exports = Extra =>
    Nunjucks.render('reset_password.html', Extra)
