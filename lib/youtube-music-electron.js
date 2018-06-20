// Load in our dependencies
var electron = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;
var monogamous = require('monogamous');
var _ = require('underscore');
var replify = require('replify');
var assets = require('./assets');
var appMenu = require('./app-menu');
var appTray = require('./app-tray');
var Config = require('./config');
var getLogger = require('./logger');
var shortcuts = require('./shortcuts');
var mediaService = require('./media-service');

// Load in package info and process our CLI
var pkg = require('../package.json');
var program = require('./cli-parser').parse(process.argv);

// Generate a logger
var logger = getLogger({verbose: program.verbose});

// Log our CLI arguments
logger.debug('CLI arguments received', {argv: process.argv});

// When all Windows are closed
electron.on('window-all-closed', function handleWindowsClosed () {
  // If we are not on OSX, exit
  // DEV: OSX requires users to quit via the menu/cmd+q
  if (process.platform !== 'darwin') {
    logger.debug('All windows closed. Exiting application');
    electron.quit();
  } else {
    logger.debug('All windows closed but not exiting because OSX');
  }
});

// Generate a config based on our CLI arguments
// DEV: We need to build cliConfig off of options since we are using `camelCase` from `commander`
// https://github.com/tj/commander.js/blob/v2.9.0/index.js#L1046-L1050
function camelcase(flag) {
  return flag.split('-').reduce(function (str, word) {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}
var cliConfig = _.object(program._cliConfigKeys.map(function getCliValue (dashCaseKey) {
  var camelCaseKey = camelcase(dashCaseKey);
  return [dashCaseKey, program[camelCaseKey]];
}));
logger.debug('CLI options overriding config', cliConfig);
var config = new Config(cliConfig, program._cliInfo);
logger.debug('Generated starting config options', config.getAll());

// Define helpers for controlling/sending messages to our window
// https://github.com/atom/electron-starter/blob/96f6117b4c1f33c0881d504d655467fc049db433/src/browser/application.coffee#L87-L104
// DEV: We are choosing to dodge classes to avoid `.bind` calls
// DEV: This must be in the top level scope, otherwise our window gets GC'd
var app = {
  browserWindow: null,
  config: config,
  controlPlayPause: function () {
    if (app.browserWindow && app.browserWindow.webContents) {
      logger.debug('Sending `control:play-pause` to browser window');
      app.browserWindow.webContents.send('control:play-pause');
    } else {
      logger.debug('`control:play-pause` requested but couldn\'t find browser window');
    }
  },
  controlNext: function () {
    if (app.browserWindow && app.browserWindow.webContents) {
      logger.debug('Sending `control:next` to browser window');
      app.browserWindow.webContents.send('control:next');
    } else {
      logger.debug('`control:next` requested but couldn\'t find browser window');
    }
  },
  controlPrevious: function () {
    if (app.browserWindow && app.browserWindow.webContents) {
      logger.debug('Sending `control:previous` to browser window');
      app.browserWindow.webContents.send('control:previous');
    } else {
      logger.debug('`control:previous` requested but couldn\'t find browser window');
    }
  },
  logger: logger,
  openAboutWindow: function () {
    logger.debug('Showing `about` window for `youtube-music-electron`');
    var info = [
      // https://github.com/corysimmons/typographic/blob/2.9.3/scss/typographic.scss#L34
      '<div style="text-align: center; font-family: \'Helvetica Neue\', \'Helvetica\', \'Arial\', \'sans-serif\'">',
        '<h1>youtube-music-electron</h1>',
        '<p>',
          'Version: ' + pkg.version,
          '<br/>',
          'Electron version: ' + process.versions.electron,
          '<br/>',
          'Node.js version: ' + process.versions.node,
          '<br/>',
          'Chromium version: ' + process.versions.chrome,
        '</p>',
      '</div>'
    ].join('');
    // DEV: aboutWindow will be garbage collection automatically
    var aboutWindow = new BrowserWindow({
      height: 180,
      icon: assets['icon-32'],
      width: 400
    });
    aboutWindow.loadURL('data:text/html,' + info);
  },
  focusSearch: function () {
    app.browserWindow.webContents.send('control:search');    
  },
  openConfigWindow: function () {
    logger.debug('Showing `config` window for `youtube-music-electron`');
    // DEV: configWindow will be garbage collection automatically
    var configWindow = new BrowserWindow({
      height: 440,
      icon: assets['icon-32'],
      width: 620
    });
    configWindow.loadURL('file://' + __dirname + '/views/config.html');
  },
  quitApplication: function () {
    logger.debug('Exiting `youtube-music-electron`');
    electron.quit();
  },
  reloadWindow: function () {
    logger.debug('Reloading focused browser window');
    BrowserWindow.getFocusedWindow().reload();
  },
  showMinimizedWindow: function () {
    // DEV: Focus is necessary when there is no taskbar and we have lost focus for the app
    app.browserWindow.restore();
    app.browserWindow.focus();
  },
  showInvisibleWindow: function () {
    app.browserWindow.show();
  },
  toggleDevTools: function () {
    logger.debug('Toggling developer tools in focused browser window');
    BrowserWindow.getFocusedWindow().toggleDevTools();
  },
  toggleFullScreen: function () {
    var focusedWindow = BrowserWindow.getFocusedWindow();
    // Move to other full screen state (e.g. true -> false)
    var wasFullScreen = focusedWindow.isFullScreen();
    var toggledFullScreen = !wasFullScreen;
    logger.debug('Toggling focused browser window full screen', {
      wasFullScreen: wasFullScreen,
      toggledFullScreen: toggledFullScreen
    });
    focusedWindow.setFullScreen(toggledFullScreen);
  },
  toggleMinimize: function () {
    if (app.browserWindow) {
      var isMinimized = app.browserWindow.isMinimized();
      logger.debug('Toggling browser window minimization', {
        isMinimized: isMinimized
      });
      if (isMinimized) {
        app.showMinimizedWindow();
      } else {
        app.browserWindow.minimize();
      }
    } else {
      logger.debug('Browser window minimization toggling requested but browser window as not found');
    }
  },
  toggleVisibility: function () {
    if (app.browserWindow) {
      var isVisible = app.browserWindow.isVisible();
      logger.debug('Toggling browser window visibility', {
        isVisible: isVisible
      });
      if (isVisible) {
        app.browserWindow.hide();
      } else {
        app.showInvisibleWindow();
      }
    } else {
      logger.debug('Browser window visibility toggling requested but browser window as not found');
    }
  }
};

// Assign tray click behavior
app.onTrayClick = (config.get('hide-via-tray') || config.get('minimize-to-tray')) ?
  app.toggleVisibility : app.toggleMinimize;
app.onRaise = (config.get('hide-via-tray') || config.get('minimize-to-tray')) ?
  app.showInvisibleWindow : app.showMinimizedWindow;

// Define our launch handler
function launchGme() {
  // Create our browser window for Google Music
  var windowInfo = config.get('window-info') || {};
  var windowOpts = {
    height: windowInfo.height || 920,
    icon: assets['icon-32'],
    skipTaskbar: config.get('skip-taskbar'),
    // Load in our Google Music bindings on the page
    webPreferences: {
      preload: __dirname + '/browser.js'
    },
    width: windowInfo.width || 1024,
    x: windowInfo.x || null,
    y: windowInfo.y || null,
    titleBarStyle: "hidden"
  };
  logger.info('App ready. Opening Google Music window', {
    options: windowOpts,
    processVersions: process.versions,
    version: pkg.version
  });
  app.browserWindow = new BrowserWindow(windowOpts);
  app.browserWindow.loadURL('https://music.youtube.com/');

  // If hiding to tray was requested, trigger a visibility toggle when the window is minimized
  if (config.get('minimize-to-tray')) {
    app.browserWindow.on('minimize', app.toggleVisibility);
  }

  // Save the window position after moving
  function saveWindowInfo() {
    config.set('window-info', app.browserWindow.getBounds());
  }
  app.browserWindow.on('move', _.debounce(function handleWindowMove () {
    logger.debug('Browser window moved, saving window info in config.');
    saveWindowInfo();
  }, 250));

  // Save the window size after resizing
  app.browserWindow.on('resize', _.debounce(function handleWindowResize () {
    logger.debug('Browser window resized, saving window info in config.');
    saveWindowInfo();
  }, 250));

  // When our window is closed, clean up the reference to our window
  app.browserWindow.on('closed', function handleWindowClose () {
    logger.debug('Browser window closed, garbage collecting `browserWindow`');
    app.browserWindow = null;
  });

  // Save browser window context to replify
  // http://dshaw.github.io/2012-10-nodedublin/#/
  if (program.debugRepl) {
    var replServer = replify('youtube-music-electron', null, {gme: app});
    replServer.on('listening', function handleReplServerListen () {
      var socketPath = replServer.address();
      logger.info('Debug repl opened at "%s". This should be accessible via `npm run debug-repl`', socketPath);
    });
  }

  // Set up our application menu, tray, and shortcuts
  appMenu.init(app);
  appTray.init(app);
  shortcuts.init(app);
  mediaService.init(app);

  console.info("all services started");
}

// If we are only allowing single instances
var booter;
if (!config.get('allow-multiple-instances')) {
  // Start up/connect to a monogamous server (detects other instances)
  booter = monogamous({sock: pkg.name});

  // If we are the first instance, start up gme
  booter.on('boot', launchGme);

  // Otherwise, focus it
  booter.on('reboot', app.onRaise);

  // If we encounter an error, log it and start anyway
  booter.on('error', function handleError (err) {
    logger.error('Error while starting/connecting to monogamous server', err);
    logger.info('Ignoring monogamous error, starting youtube-music-electron');
    launchGme();
  });
}

// When Electron is done loading
electron.on('ready', function handleReady () {
  // If we have a booter, invoke it
  if (booter) {
    booter.boot();
  // Otherwise, launch immediately
  } else {
    launchGme();
  }
});
