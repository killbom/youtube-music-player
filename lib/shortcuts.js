// Load in our dependencies
var globalShortcut = require('electron').globalShortcut;
var ipcMain = require('electron').ipcMain;

// Define a function to bind shortcuts
exports.init = function (app) {
  // Set up media keys
  var shortcutCallbacks = {
    'playpause-shortcut': app.controlPlayPause,
    'next-shortcut': app.controlNext,
    'previous-shortcut': app.controlPrevious
  };
  var playpauseShortcut = app.config.get('playpause-shortcut');
  if (playpauseShortcut && !globalShortcut.register(playpauseShortcut, shortcutCallbacks['playpause-shortcut'])) {
    app.logger.warn('Failed to bind `' + playpauseShortcut + '` shortcut');
  }
  var nextShortcut = app.config.get('next-shortcut');
  if (nextShortcut && !globalShortcut.register(nextShortcut, shortcutCallbacks['next-shortcut'])) {
    app.logger.warn('Failed to bind `' + nextShortcut + '` shortcut');
  }
  var previousShortcut = app.config.get('previous-shortcut');
  if (previousShortcut && !globalShortcut.register(previousShortcut, shortcutCallbacks['previous-shortcut'])) {
    app.logger.warn('Failed to bind `' + previousShortcut + '` shortcut');
  }

  // When a shortcut change is requested
  ipcMain.on('set-shortcut-sync', function handleShortcutChange (evt, shortcutName, accelerator) {
    // Prepare common set of results
    var previousAccelerator = app.config.get(shortcutName);
    var retVal = {
      success: false,
      previousAccelerator: previousAccelerator,
      accelerator: accelerator
    };

    // If the accelerator is the same as the current one, exit with success
    if (previousAccelerator === accelerator) {
      retVal.success = true;
      evt.returnValue = JSON.stringify(retVal);
      return;
    }

    // If the accelerator is nothing, then consider it a success
    if (accelerator === '') {
      retVal.success = true;
    // Otherwise, attempt to register the new shortcut
    } else {
      app.logger.info('Attempting to register shortcut "' + shortcutName + '" under "' + accelerator + '"');
      try {
        retVal.success = globalShortcut.register(accelerator, shortcutCallbacks[shortcutName]);
        app.logger.info('Registration successful');
      } catch (err) {
        // Catch any unrecognized accelerators
      }
    }

    // If we were successful, remove the last binding and update our config
    if (retVal.success) {
      if (previousAccelerator) {
        app.logger.info('Unregistering shortcut "' +
          shortcutName + '" from "' + previousAccelerator + '"');
        globalShortcut.unregister(previousAccelerator);
      }

      app.logger.info('Updating config...');
      app.config.set(shortcutName, accelerator);
    // Otherwise, log failure
    } else {
      app.logger.info('Registration failed. Couldn\'t register shortcut "' +
        shortcutName + '" to "' + accelerator + '"');
    }

    // In any event, return with our success status
    evt.returnValue = JSON.stringify(retVal);
  });
};
