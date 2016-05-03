import { getLogger } from 'appium-logger';

let loggers = {};
let noPrefix = getLogger();

function log (log, prefix, level="info") {
  if (prefix) {
    if (!loggers[prefix]){
      loggers[prefix] = getLogger(prefix);
    }
    loggers[prefix][level](log);
  } else {
    noPrefix[level](log);
  }
}

export { log }
