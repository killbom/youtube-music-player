var ipcMain = require('electron').ipcMain;
var getLogger = require('./logger');

var _ = require('underscore');
var MediaService = require('./media-control/darwin/index');
var MediaService = require('./media-control/windowsme/index');


exports.init = function (app) {
  var logger = getLogger({verbose: true});
  var mediaService = new MediaService();

  mediaService.on('next', app.controlNext);
  mediaService.on('playpause', app.controlPlayPause);
  mediaService.on('play', app.controlPlayPause);
  mediaService.on('pause', app.controlPlayPause);
  mediaService.on('previous', app.controlPrevious);

  var songInfo = {};
  ipcMain.on('change:song', function handleSongChange (evt, _songInfo) {
    songInfo = {
      duration: _songInfo.duration * 1e3,
      currentTime: 0,
      state: "playing",
      artist: _songInfo.artist,
      title: _songInfo.title
    };
    mediaService.setMetaData(songInfo);
  });

  ipcMain.on('change:playback-time', function handlePlaybackUpdate (evt, playbackInfo) {
    var newPosition = playbackInfo * 1e3;
    songInfo.currentTime = newPosition; 
    mediaService.setMetaData(songInfo);
  });

  ipcMain.on('change:playback', function handlePlaybackChange (evt, playbackState) {
    songInfo.state = playbackState;
    mediaService.setMetaData(songInfo);
  });

  mediaService.startService();
};
