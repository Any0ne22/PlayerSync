// Parameters
let websocketLink = "ws://127.0.0.1:8000/ws";

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

// Synced players
const syncs = new Map();

class Player {
    constructor(uid, port) {
        this.uid = uid;
        this.name = "";
        this.roomName = "";
        this.port = port;
        this.websocket = undefined;
        this.init = false;
    }

    initPort(room) {
        this.roomName = room;
        this.port.postMessage({action : "init"});
        this.connectSocket(room);
        this.init = true;
    }

    connectSocket(roomName) {
        // Websocket initialization
        const socket = new WebSocket(websocketLink);
        const port = this.port;
        this.websocket = socket;
        const room = this.roomName;
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
            }
        }

        socket.onerror = function(_event) {
            notif(`Error connecting to room ${roomName} (server @ ${websocketLink})`);
            socket.close();
            room = '';
        }
    }

    quitRoom() {
        this.roomName = "";
        this.websocket.close();
        this.init = false;
    }
}

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name == "content-port") {
        // Connection of a content script
        console.log("Player connected");
        const id = uuidv4();

        const player = new Player(id, port);
        syncs.set(id, player);


        // #### Port events ####
        port.onMessage.addListener(function(msg) {
            if(["play", "pause"].includes(msg.action)) {
                // forwarding message to websocket
                player.websocket.send(JSON.stringify({event: "message", data: msg}));
            } else if (msg.action == "window_name") {
                player.name = msg.value;
            }
            console.log(msg.action);
        });

        port.onDisconnect.addListener(() => {
            console.log("Player disconnected");
            syncs.delete(id);
            player.quitRoom();
        });

    } else if (port.name == "popup") {
        // Connection of a popup script
        port.onMessage.addListener(function(msg) {
            switch (msg.action) {
                case "get_players":
                    // Send the players list to the popup
                    sendPlayers2popup(port);
                    break;
                case "init_player":
                    syncs.get(msg.playerId).initPort(msg.room);
                    break;
                case "quit_room":
                    syncs.get(msg.playerId).quitRoom();
                    break;
                default:
                    break;
            }
        });
    }
});

function sendPlayers2popup(port) {
    port.postMessage(
        {
            action : "player_list",
            players:  Array.from(syncs).map(([key, value]) => ({
                id: key,
                name: value.name,
                roomName: value.roomName
            }))
        }
    );
}

function notif(msg) {
    new Notification('Player sync', {
        body: msg,
    });
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
