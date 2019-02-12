const chalk = require('chalk');

function Timestamp() {
    return new Date().toString().substring(4, 24);
}

const ip = address => address ? chalk.magenta(` (${address})`) : '';

function error(Tag, ...Arguments) {
    console.log(chalk`{gray ${Timestamp()}}${ip(this.ip)} {red [ERROR]} {bold ${Tag}}:`, ...Arguments);
}

function warn(Tag, ...Arguments) {
    console.log(chalk`{gray ${Timestamp()}}${ip(this.ip)} {yellow [WARN]} {bold ${Tag}}:`, ...Arguments);
}

function info(Tag, ...Arguments) {
    console.log(chalk`{gray ${Timestamp()}}${ip(this.ip)} {blue [INFO]} {bold ${Tag}}:`, ...Arguments);
}

async function attach(ctx, next) {
    ctx.error = error.bind(ctx);
    ctx.warn = warn.bind(ctx);
    ctx.info = info.bind(ctx);

    await next();
}

module.exports = { error, warn, info, attach };
