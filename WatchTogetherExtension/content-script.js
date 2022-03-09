let init = false;   // Is the player connected to a room
let p = null;       // The video DOM object
let lock = false;
let tabId = -1;     // The id of the actual tab

let port = chrome.runtime.connect({name: "content-port"});
port.onMessage.addListener(function(msg) {
    if(msg.action == "init" && !init) {
        initPlayerSync();
    } else if(init && msg.action === "play") {
        p.currentTime = msg.time;
        if(!lock) p.play();
    } else if(init && msg.action === "pause") {
        if(!lock) p.pause();
    }
});

function sendMessagePromise(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, response => {
            resolve(response);
        });
    });
}

async function init_tab() {
    // Connect to the backend to get the tab id
    let data = await sendMessagePromise({ action: "init_tab" });
    tabId = data.tabId;

    // Initialize player
    await port.postMessage({action: 'init', tab: tabId});
}

function initPlayerSync() {
    // Access the page's video player
    p = document.getElementsByTagName("video")[0];
    p.onplay = function() {
        port.postMessage({action: 'play', time: p.currentTime});
        lock = true;
        setTimeout(() => {lock =false}, 200);
    }
    p.onpause = function() {
        port.postMessage({action: 'pause'});
        lock = true;
        setTimeout(() => {lock =false}, 200);
    }
    
    init = true;
}

init_tab();
