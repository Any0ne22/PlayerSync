import { Application, Router, Context } from 'https://deno.land/x/oak@v7.7.0/mod.ts';
import { isWebSocketCloseEvent, WebSocket } from "https://deno.land/std@0.100.0/ws/mod.ts";
import { v4 } from "https://deno.land/std@0.100.0/uuid/mod.ts";
  
// #### Parameters ####
const port = 8000;
const version = "1.1.0";

// #### Room management ####

interface Room {
    name : string;
    users : Map<string, WebSocket>;
}

const rooms = new Map<string, Room>();
const sockets = new Map<string, WebSocket>();

function joinRoom(roomName : string, uid : string, userSocket : WebSocket) : Room {
    let room = rooms.get(roomName);
    if (room == undefined) {
        room = {name: roomName, users: new Map<string, WebSocket>()}
        rooms.set(roomName, room);
    }
    room.users.set(uid, userSocket);
    broadcast2room(roomName, {action : "room_joined", users: room.users.size});
    console.log(`<${roomName}> Room ${roomName} joined by ${uid} (${room.users.size} users connected)`);
    return room;
}

function quitRoom(roomName: string, uid: string){
    const room = rooms.get(roomName);
    if (!room) return;
    room?.users.delete(uid);
    if (room.users.size > 0) {
        broadcast2room(roomName, {action : "room_quitted", users: room.users.size})
    } else {
        rooms.delete(roomName);
    }
    console.log(`<${roomName}> Room ${roomName} quitted by ${uid} (${room.users.size} users connected)`);
}

function _broadcast(message: Record<string, unknown>) {
    for(const [_,ws] of sockets.entries()) {
        ws.send(JSON.stringify(message));
    }
}

function broadcast2room(roomName: string, message: Record<string, unknown>) {
    const room = rooms.get(roomName);
    if (!room) return
    for(const [_,ws] of room.users.entries()) {
        ws.send(JSON.stringify(message));
    }
}


// #### Websocket ####

interface Event {
    event : string;
    data : Record<string, unknown>;
}

async function watchSocket(ws: WebSocket) {
    const uid = v4.generate();
    let room = "";
    sockets.set(uid, ws);

    // Listening of WebSocket events
    for await (const data of ws) {
        const event : Event = typeof data === "string" ? JSON.parse(data) : data;
        
        if (isWebSocketCloseEvent(data)) {
            sockets.delete(uid);
            quitRoom(room, uid);
            break;
        }
  
        switch (event.event) {
            case "message":
                console.log(`<${room}> Room ${room} : ${JSON.stringify(event.data)}`);
                broadcast2room(room,event.data);
                break;
            case "join_room":
                room = event.data.roomName as string;
                joinRoom(room, uid, ws);
                break;
        }
    }
}


// #### Web server ####
const app = new Application();
const router = new Router();

router.get('/', (ctx) => {
    ctx.response.body = "Backend WatchTogether";
});

router.get('/info', (ctx) => {
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.body = {version : version, active_users: sockets.size, active_rooms: rooms.size};
});

router.get('/ws', async (ctx : Context) => {
    // Websocket route
    const sock = await ctx.upgrade();
    watchSocket(sock);
});

app.use(router.allowedMethods());
app.use(router.routes());
 
app.addEventListener('listen', () => {
  console.log(`Welcome to WatchTogether v${version} server !\nListening on: localhost:${port}`);
});
 
await app.listen({ port });
