let players = [];


// Interface events
document.getElementById("sync-button").addEventListener("click", function() {
    const playerId = document.getElementById("player-selector").value;
    const roomName = document.getElementById("room-name").value;

    port.postMessage({action: "init_player", playerId: playerId, room: roomName});
    port.postMessage({action : "get_players"});
});

document.getElementById("disconnect-button").addEventListener("click", function() {
    const playerId = document.getElementById("player-selector").value;

    port.postMessage({action: "quit_room", playerId: playerId});
    port.postMessage({action : "get_players"});
});

document.getElementById('player-selector').onchange = function() {
    for(const player of players) {
        if(player.id === document.getElementById("player-selector").value) {
            showInterface(player);
            break;
        }
    }
};

function showInterface(player) {
    document.getElementById("room-name").value = player.roomName;
    if (player.roomName != "") {
        document.getElementById("sync-button").style.display = "none" ;
        document.getElementById("disconnect-button").style.display = "block";
        document.getElementById("room-name").disabled = true;
        document.getElementById("connected-users").innerHTML = `<br/>${player.connectedUsers} connected users`;
        document.getElementById("connected-users").style.display = "block";
    } else {
        document.getElementById("sync-button").style.display = "block" ;
        document.getElementById("disconnect-button").style.display = "none" ;
        document.getElementById("room-name").disabled = false;
        document.getElementById("connected-users").style.display = "none";
    }
}

const port = chrome.runtime.connect({name: "popup"});
port.onMessage.addListener(function(msg) {
    if(msg.action == "player_list") {
        players = msg.players;
        let first = true;
        document.getElementById("player-selector").innerHTML = "";
        for(const player of players) {
            document.getElementById("player-selector").innerHTML += `<option value="${player.id}">${player.name}</option>`;
            if(first){
                showInterface(player);
                first = false;
            }
        }
    }
});

port.postMessage({action : "get_players"});
