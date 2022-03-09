from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.utils import ConnectionManager

app = FastAPI()

socket_manager = ConnectionManager()

origins: List[str] = ["0.0.0.0"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"app": "watchtogether"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await socket_manager.connect(websocket)
    try:
        while True:
            msg = await websocket.receive_json()
            socket_manager.on_message(msg, websocket)
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket)
