const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// MAX USERS
const MAX_USERS = 40;

// CONNECTED USERS
// userId -> socket
const users = new Map();

// SERVE FRONTEND
app.use(express.static(path.join(__dirname)));

// HEALTH CHECK
app.get("/api/ping", (req, res) => {
  res.json({
    ok: true,
    users: users.size
  });
});

// WEBSOCKET
wss.on("connection", (ws) => {

  let currentUser = null;

  ws.on("message", (raw) => {

    try {

      const data = JSON.parse(raw);

      // REGISTER USER
      if (data.type === "register") {

        if (users.size >= MAX_USERS) {

          ws.send(JSON.stringify({
            type: "error",
            message: "Server full"
          }));

          return;
        }

        currentUser = data.userId;

        users.set(currentUser, ws);

        ws.send(JSON.stringify({
          type: "registered",
          userId: currentUser
        }));

        console.log(currentUser + " connected");

        return;
      }

      // SEND MESSAGE
      if (data.type === "message") {

        const targetSocket = users.get(data.to);

        const payload = {
          type: "message",
          from: currentUser,
          text: data.text,
          createdAt: Date.now()
        };

        // SEND TO TARGET
        if (targetSocket) {
          targetSocket.send(JSON.stringify(payload));
        }

        // SEND BACK TO SENDER
        ws.send(JSON.stringify({
          ...payload,
          self: true
        }));

        return;
      }

    } catch (err) {
      console.log(err);
    }

  });

  ws.on("close", () => {

    if (currentUser) {
      users.delete(currentUser);
      console.log(currentUser + " disconnected");
    }

  });

});

server.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
