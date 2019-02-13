const Koa = require('koa');
const log = require('./log');

const App = new Koa();

App.use(async ctx => {
    ctx.redirect('https://localhost:8443' + ctx.url, 301);
});

module.exports.listen = Port => {
    App.listen(Port, () =>
        log.info('HTTP', `Listening on localhost:${Port}`));
};
