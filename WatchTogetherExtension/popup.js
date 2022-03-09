let player;


// Interface events
document.getElementById("sync-button").addEventListener("click", function() {
    let roomName = document.getElementById("room-name").value;
    port.postMessage({action: "init_player", playerId: player.id, room: roomName});
    port.postMessage({action : "get_players"});
});

document.getElementById("disconnect-button").addEventListener("click", function() {

    port.postMessage({action: "quit_room", playerId: player.id});
    port.postMessage({action : "get_players"});
});

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
    if(msg.action == "actual_tab") {
        player = msg.player;
        document.getElementById("player-selector").value = player.name;
        showInterface(player);
    }
});

port.postMessage({action : "get_players"});
