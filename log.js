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
    const Methods = {
        error: error.bind(ctx),
        warn: warn.bind(ctx),
        info: info.bind(ctx)
    };

    Object.assign(ctx, Methods);
    Object.assign(ctx.request, Methods)

    await next();
}

module.exports = { error, warn, info, attach };
