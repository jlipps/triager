var winston = require('winston');
var winstonLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var winstonColors = {
  debug: 'grey',
  info: 'cyan',
  warn: 'yellow',
  error: 'red'
};
var setup = false;

function getLogger (config = {log: false}) {
  let curLog = winston.loggers.get('triager');
  if (setup) {
    return curLog;
  }

  winston.setLevels(winstonLevels);
  winston.addColors(winstonColors);
  let consoleTransport = new (winston.transports.Console)({
    name: "console"
  , timestamp: true
  , colorize: true
  , handleExceptions: true
  , exitOnError: false
  , level: 'debug'
  });
  let transports = [consoleTransport];
  if (config.log) {
    transports.push(new (winston.transports.File)({
      name: "file"
    , timestamp: true
    , filename: config.log
    , maxFiles: 1
    , colorize: false
    , handleExceptions: true
    , exitOnError: false
    , json: false
    , level: 'debug'
    }));
  }

  let logger = new (winston.Logger)({transports: transports});
  winston.loggers.add('triager', logger);
  setup = true;
  return logger;
}

export { getLogger };
