let init = false;   // Is the player connected to a room
let p = null;       // The video DOM object

let tabId = -1;

let port = chrome.runtime.connect({name: "content-port"});
port.onMessage.addListener(function(msg) {
    console.log(msg);
    if(msg.action == "init" && !init) {
        initPlayerSync();
    } else if(init && msg.action === "play") {
        p.currentTime = msg.time;
        p.play();
    } else if(init && msg.action === "pause") {
        p.pause();
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
    let data = await sendMessagePromise({ action: "init_tab" });
    tabId = data.tabId;

    await port.postMessage({action: 'init', tab: tabId});
}

function initPlayerSync() {
    // Access the page's video player
    p = document.getElementsByTagName("video")[0];
    p.onplay = function() {
        port.postMessage({action: 'play', time: p.currentTime});
    }
    p.onpause = function() {
        port.postMessage({action: 'pause'});
    }
    
    init = true;
}


(async () => {
    await init_tab();
})();
