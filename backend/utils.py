from typing import Dict, List
import asyncio

from fastapi import WebSocket


class Room:
    def __init__(self, name: str):
        self.name: str = name
        self.webpage: str = "about:blank"
        self.users: List[WebSocket] = []

    def broadcast_to_others(self, user: WebSocket, payload: any):
        for other_user in self.users:
            if other_user != user:
                asyncio.ensure_future(other_user.send_json(payload))

    def broadcast(self, payload: any):
        for other_user in self.users:
            asyncio.ensure_future(other_user.send_json(payload))

    def change_page(self, user: WebSocket, new_page: str):
        print("coucou")
        self.webpage = new_page
        payload = {"action": "change_page", "data": {"url": new_page}}
        self.broadcast_to_others(user, payload)

    def change_time(self, user: WebSocket, time: float):
        payload = {"action": "change_time", "data": time}
        self.broadcast_to_others(user, payload)

    def play(self, user: WebSocket, time: float):
        self.broadcast_to_others(
            user,
            {
                "action": "play",
                "time": time,
            },
        )

    def pause(self, user: WebSocket):
        self.broadcast_to_others(user, {"action": "pause"})

    def room_joined(self, user: WebSocket):
        if not user in self.users:
            self.users.append(user)
            self.broadcast(
                {
                    "action": "room_joined",
                    "users": len(self.users),
                }
            )

    def room_quitted(self, user: WebSocket):
        if user in self.users:
            self.users.remove(user)
            self.broadcast_to_others(
                user, {"action": "room_quitted", "users": len(self.users)}
            )

    def users_in_room(self):
        return len(self.users)

    def message_received(self, user: WebSocket, message: str):
        try:
            if message["action"] == "play":
                self.play(user, message["time"])
            elif message["action"] == "pause":
                self.pause(user)
            elif message["action"] == "url_changed":
                self.change_page(user, message["url"])
        except:
            pass


class ConnectionManager:
    """
    Manage WebSocket connections
    """

    def __init__(self):
        """
        Initialize the object with an empty list of websockets
        """
        self.active_connections: List[WebSocket] = []
        self.rooms: Dict[str, Room] = {}
        self.room_of_users: Dict[WebSocket, Room] = {}

    async def connect(self, websocket: WebSocket):
        """
        Connect a new websocket and register it.

        :param websocket: a new websocket
        """
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """
        Remove a disconnected websocket

        :param websocket: the websoket to remove
        """
        self.active_connections.remove(websocket)
        try:
            room = self.room_of_users[websocket]
            room.room_quitted(websocket)
            if room.users_in_room() <= 0:
                del self.rooms[room.name]
                del self.room_of_users[websocket]
        except:
            pass

    def active_connection_number(self) -> int:
        """
        Get the actual number of connected websockets
        """
        return len(self.active_connections)

    async def send_message(self, message: str, websocket: WebSocket):
        """
        Send a message to a given WebSocket

        :param message: the message to send
        :param websocket: the recipient websocket
        """
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        """
        Broadcast a message to all WebSockets

        :param message: the message to send
        """
        for connection in self.active_connections:
            await connection.send_text(message)

    def on_message(self, message: any, websocket: WebSocket):
        print(message)
        try:
            if message["event"] == "join_room":
                room_name = message["data"]["roomName"]
                room: Room = self.rooms.get(room_name)
                if room is None:
                    room = Room(name=room_name)
                room.room_joined(websocket)
                self.rooms[room_name] = room
                self.room_of_users[websocket] = room
            elif message["event"] == "message":
                self.room_of_users[websocket].message_received(
                    websocket, message["data"]
                )
        except:
            pass
