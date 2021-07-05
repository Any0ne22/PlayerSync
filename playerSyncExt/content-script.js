let init = false;   // Is the player connected to a room
let lock = false;   // Locked if the last action come from this player
let p = null;       // The video DOM object

var port = chrome.runtime.connect({name: "content-port"});
port.onMessage.addListener(function(msg) {
    console.log(msg);
    if(msg.action == "init" && !init) {
        initPlayerSync();
    } else if(init && msg.action === "play") {
        p.currentTime = msg.time;
        if(!lock) p.play();
        lock = false;
    } else if(init && msg.action === "pause") {
        if(!lock) p.pause();
        lock = false;
    }
});

function getWindowName() {
    // Check for page title changes
    const target = document.querySelector('title');
    const observer = new MutationObserver(function() {
        port.postMessage({action: 'window_name', value: document.title});
    });
    const config = { subtree: true, characterData: true, childList: true };
    observer.observe(target, config);

    port.postMessage({action: 'window_name', value: document.title});
}

function initPlayerSync() {
    // Access the page's video player
    p = document.getElementsByTagName("video")[0];
    p.onplay = function() {
        port.postMessage({action: 'play', time: p.currentTime});
        lock = true;
    }
    p.onpause = function() {
        port.postMessage({action: 'pause'});
        lock = true;
    }
    
    init = true;
}

getWindowName();
