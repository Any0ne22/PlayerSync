// Parameters
let websocketLink = "ws://127.0.0.1:8000/ws";

// Dictionary of players (key: tabId, value: player)
const players = {};

chrome.storage.local.get(['server'], function(result) {
    if(!result.server) {
        chrome.storage.local.set({server: "ws://127.0.0.1:8000/ws"})
    } else {
        websocketLink = result.server;
    }
});

chrome.storage.onChanged.addListener(function (changes) {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if(key == "server") {
        websocketLink = newValue;
      }
    }
});


// Give a tab its number
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action == "init_tab") {
        console.log(`Init tab ${sender.tab.id}`);
        sendResponse({tabId: sender.tab.id});
     }
});

class Player {
    constructor(id, port) {
        this.id = id;
        this.name = "";
        this.roomName = "";
        this.port = port;
        this.websocket = undefined;
        this.init = false;
        this.connectedUsers = 0;
    }

    initPort(room) {
        this.roomName = room;
        this.port.postMessage({action : "init"});
        this.connectSocket(room);
        this.init = true;
    }

    sendUrlToServ() {
        if(this.init) this.websocket.send(JSON.stringify({event: "url_changed", data: {url : this.url}}));
    }

    connectSocket(roomName) {
        // Websocket initialization
        const socket = new WebSocket(websocketLink);
        const port = this.port;
        this.websocket = socket;
        const room = this.roomName;
        const plr = this;
        // #### Websocket events ####
        socket.onopen = function () {
            socket.send(JSON.stringify({event: "join_room", data: {roomName : roomName}}));
        }

        socket.onmessage = function(data) {
            const parsedData = JSON.parse(data.data);
            console.log(parsedData);
            if(["play", "pause"].includes(parsedData.action)) {
                //forwarding to content script
                port.postMessage(parsedData);
            } else if(parsedData.action === "room_quitted") {
                notif(`${room} : someone left the room (${parsedData.users} left)`);
                plr.connectedUsers = parsedData.users;
                sendActiveTab(plr.port);
            } else if(parsedData.action === "room_joined") {
                notif(`${room} : someone joined the room (${parsedData.users} connected)`);
                plr.connectedUsers = parsedData.users;
                sendActiveTab(plr.port);
            }
        }

        socket.onerror = function(_event) {
            notif(`Error connecting to room ${roomName} (server @ ${websocketLink})`);
            this.room = '';
            socket.close();
        }
    }

    quitRoom() {
        this.roomName = "";
        if (this.websocket) this.websocket.close();
        this.init = false;
    }
}

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name == "content-port") {
        // Connection of a content script
        console.log("Player connected");
        let tabId = 0

        let player = null;

        // #### Port events ####
        port.onMessage.addListener(async function(msg) {
            if(["play", "pause"].includes(msg.action)) {
                // forwarding message to websocket
                player.websocket.send(JSON.stringify({event: "message", data: msg}));
            } else if (msg.action == "init") {
                console.log(`message de ${msg.tab}`);
                tabId = msg.tab;

                if(players[tabId]) {
                    console.log(`retrieving player ${tabId}`);
                    player = players[tabId];
                    player.port = port;
                } else {
                    console.log(`adding player ${tabId}`);
                    player = new Player(tabId, port);
                    players[tabId] = player;
                }

                const tab = await getTabInfos(tabId)

                player.name = tab.title;
                if(player.url != tab.url) {
                    player.url = tab.url;
                    player.sendUrlToServ();
                }
                
                console.log(`tab ${tabId}, ${tab.title} : ${tab.url}`);
            }
            console.log(msg.action);
        });

        port.onDisconnect.addListener(() => {
            console.log("Player disconnected");
            //player.quitRoom();
        });

    } else if (port.name == "popup") {
        // Connection of a popup script
        port.onMessage.addListener(function(msg) {
            switch (msg.action) {
                case "get_player":
                    // Send the player to the popup
                    sendActiveTab(port);
                    break;
                case "init_player":
                    players[msg.playerId].initPort(msg.room);
                    break;
                case "quit_room":
                    players[msg.playerId].quitRoom();
                    break;
                default:
                    break;
            }
        });
    }
});

async function getTabInfos(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, tab => {
            resolve(tab);
        });
    });
}

async function getActiveTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const tab = tabs[0];
            resolve(tab);
        });
    });
}

async function sendActiveTab(port) {
    const tab = await getActiveTab();
    const player = players[tab.id];

    port.postMessage(
        {
            action : "actual_tab",
            player: {
                id: tab.id,
                name: tab.title,
                roomName: player.roomName,
                connectedUsers: player.connectedUsers
            }
        }
    );
    
}

function notif(msg) {
    new Notification('Player sync', {
        body: msg,
    });
}
