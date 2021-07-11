// Parameters
const defaultWebsocketLink = "ws://127.0.0.1:8000/ws";
let websocketLink = defaultWebsocketLink;

chrome.storage.local.get(['server'], function(result) {
    if(!result.server) {
        chrome.storage.local.set({server: defaultWebsocketLink})
    } else {
        websocketLink = result.server;
    }
});

chrome.storage.onChanged.addListener(function (changes) {
    // Watch for changes to the server address
    for (const [key, { newValue }] of Object.entries(changes)) {
        if(key == "server") {
            websocketLink = newValue;
        }
    }
});

// Synced players
const syncedPlayers = new Map();


class Player {
    constructor(port) {
        this.name = "";
        this.room = {
            name: "",
            connectedUsers: 0
        }
        this.port = port;
        this.websocket = undefined;
        this.init = false;

        // #### port events ####
        this.port.onMessage.addListener(this.portOnMessage());
        this.port.onDisconnect.addListener(this.portOnDisconnect());
    }

    initRoom(roomName) {
        this.room.name = roomName;
        this.port.postMessage({action : "init"});
        this.connectSocket();
        this.init = true;
    }

    connectSocket() {
        if(this.init) {
            throw new Error("Socket already initialized");
        }

        // Websocket initialization
        this.websocket = new WebSocket(websocketLink);

        // #### Websocket events ####
        this.websocket.onopen = this.socketOnOpen();
        this.websocket.onmessage = this.socketOnMessage();
        this.websocket.onerror = this.socketOnError();
    }

    socketJoinRoom() {
        this.websocket.send(JSON.stringify({event: "join_room", data: {roomName : this.room.name}}));
    }

    socketOnOpen() {
        return () => {
            this.socketJoinRoom();
        }
    }

    socketOnMessage() {
        // In arrow function 'this' is still referencing the parent of the inner function
        return (data) => {
            const parsedData = JSON.parse(data.data);
            console.log(parsedData);
            if(["play", "pause"].includes(parsedData.action)) {
                //forwarding to content script
                this.port.postMessage(parsedData);
            } else if(parsedData.action === "room_quitted") {
                notif(`${this.room.name} : someone left the room (${parsedData.users} left)`);
                this.room.connectedUsers = parsedData.users;
                sendPlayers2popup(this.port);
            } else if(parsedData.action === "room_joined") {
                notif(`${this.room.name} : someone joined the room (${parsedData.users} connected)`);
                this.room.connectedUsers = parsedData.users;
                sendPlayers2popup(this.port);
            }
        }
    }

    socketOnError() {
        return (_event) => {
            notif(`Error connecting to room ${roomName} (server @ ${websocketLink})`);
            this.quitRoom();
        }
    }

    portOnMessage() {
        return (msg) => {
            if(["play", "pause"].includes(msg.action) && this.init) {
                // forwarding message to websocket
                this.websocket.send(JSON.stringify({event: "message", data: msg}));
            } else if (msg.action == "window_name") {
                this.name = msg.value;
            }
            console.log(msg.action);
        }
    }

    portOnDisconnect() {
        return () => {
            this.quitRoom();
        }
    }

    quitRoom() {
        if(this.init) {
            try{
                this.websocket.close();
            } catch(_e) {
                null;
            }
            notif(`${this.room.name} : disconnected from room.`);
            this.room.name = "";
            this.room.connectedUsers = 0;
            this.init = false;
        }
    }
}

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name == "content-port") {
        // Connection of a content script
        console.log("Player connected");
        const id = uuidv4();

        const player = new Player(port);
        syncedPlayers.set(id, player);

        // When the port is disconnected eg. the tab is closed
        player.port.onDisconnect.addListener(() => {
            console.log("Player disconnected");
            syncedPlayers.delete(id);
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
                    syncedPlayers.get(msg.playerId).initRoom(msg.room);
                    break;
                case "quit_room":
                    syncedPlayers.get(msg.playerId).quitRoom();
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
            players:  Array.from(syncedPlayers).map(([key, value]) => ({
                id: key,
                name: value.name,
                roomName: value.room.name,
                connectedUsers: value.room.connectedUsers
            }))
        }
    );
}

function notif(msg) {
    new Notification('WatchTogether', {
        body: msg,
    });
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
