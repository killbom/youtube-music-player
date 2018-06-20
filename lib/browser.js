// Load in our dependencies
var ipcRenderer = require('electron').ipcRenderer;
var webContents = require('electron').remote.getCurrentWebContents();

// Overload `window.addEventListener` to prevent `unload` bindings
var _addEventListener = window.addEventListener;
window.addEventListener = function (eventName, fn, bubbles) {
  // If we received an unload binding, ignore it
  if (eventName === 'unload' || eventName === 'beforeunload') {
    return;
  }

  // Otherwise, run our normal addEventListener
  return _addEventListener.apply(window, arguments);
};

// When we finish loading
function handleLoad() {
  // update styles
  webContents.insertCSS("#nav-bar-background { -webkit-user-select: none;-webkit-app-region: drag; }");
  webContents.insertCSS("#chips { margin-top: 10px !important; }");

  // Move topbar
  document.getElementsByTagName("ytmusic-nav-bar")[0].style.marginTop = "10px";

  // var events = ['change:song', 'change:playback', 'change:playback-time'];
  var playpause = document.getElementsByClassName("play-pause-button")[0];
  var timebar = document.getElementById("progress-bar");
  var nowPlaying = document.getElementsByClassName("middle-controls")[0];
  var pauseValue = null;
  var artist = null;
  ipcRenderer.send("change:playback", "stopped");
  new MutationObserver(function handleChange(data) {
    var state = data[0].target.attributes.getNamedItem("title").value;
    
    // The first time this is observer it will be the paused version
    if (pauseValue == null) {
      pauseValue = state;
    }
    var paused = pauseValue == state;
    if (paused) {
      console.log("setting state to: paused");
      ipcRenderer.send("change:playback", "paused");
    } else {
      console.log("setting state to: playing");
      ipcRenderer.send("change:playback", "playing");
    }

    var text = nowPlaying.getElementsByClassName("byline")[0];
    var newArtist = text.firstChild.firstChild.textContent;
    var title = nowPlaying.getElementsByClassName("title")[0].textContent;
    var duration = parseInt(timebar.attributes.getNamedItem("aria-valuemax").value);
    if (duration != 0 && artist != newArtist) {
      artist = newArtist;
      var ev = { title, artist, duration };
      console.log(ev);
      ipcRenderer.send("change:song", ev);
    }
  }).observe(playpause, { attributes: true, attributeFilter: ["title"] })

  new MutationObserver(function handleTimeUpdate(data) {
    console.log(timebar.value);
    ipcRenderer.send("change:playback-time", timebar.value);
  }).observe(timebar, { attributes: true, attributeFilter: ["value"] });

  // When we receive requests to control playback, run them
  ipcRenderer.on('control:play-pause', function handlePlayPause(evt) {
    console.log("playpause");
    playpause.click();
  });
  ipcRenderer.on('control:next', function handleNext(evt) {
    document.getElementsByClassName("next-button")[0].click();
  });
  ipcRenderer.on('control:previous', function handlePrevious(evt) {
    document.getElementsByClassName("previous-button")[0].click();
  });
  ipcRenderer.on('control:search', function handleSearch(evt) {
    document.getElementsByClassName("search-icon")[0].click();
  });
}

window.addEventListener('load', handleLoad);
