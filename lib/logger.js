// Load in our dependencies
var app = require('electron').app;
var path = require('path');
var winston = require('winston');

// Load in our constants
//   e.g. ~/.config/youtube-music-electron/verbose.log
var logPath = path.join(app.getPath('userData'), 'verbose.log');

// Define our logger setup
module.exports = function (options) {
  var logger = winston.createLogger({
    transports: [
      // https://github.com/winstonjs/winston/tree/v1.0.0#console-transport
      new winston.transports.Console({
        level: options.verbose ? 'silly' : 'info',
        colorize: true,
        timestamp: true
      }),
      // https://github.com/winstonjs/winston/tree/v1.0.0#file-transport
      new winston.transports.File({
        level: 'silly',
        filename: logPath,
        colorize: false,
        timestamp: true
      })
    ]
  });

  // Log for sanity
  logger.info('Logger initialized. Writing info/warnings/errors to stdout. ' +
    'Writing all logs to "%s"', logPath);

  // Return our logger
  return logger;
};
