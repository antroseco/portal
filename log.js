const chalk = require('chalk');

function Timestamp() {
    return new Date().toString().substring(4, 24);
}

function error(Tag, ...Arguments) {
    console.log(chalk`{gray ${Timestamp()}} {red [ERROR]} {bold ${Tag}}:`, ...Arguments);
}

function warn(Tag, ...Arguments) {
    console.log(chalk`{gray ${Timestamp()}} {yellow [WARN]} {bold ${Tag}}:`, ...Arguments);
}

function info(Tag, ...Arguments) {
    console.log(chalk`{gray ${Timestamp()}} {blue [INFO]} {bold ${Tag}}:`, ...Arguments);
}

module.exports = { error, warn, info };
