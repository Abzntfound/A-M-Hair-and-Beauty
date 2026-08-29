
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("A&M Phone Assistant is online!");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("WebSocket connected");

    ws.on("message", (data) => {
        console.log("Received:", data.toString());
    });

    ws.on("close", () => {
        console.log("WebSocket disconnected");
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
