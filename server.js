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

      // REGISTER
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

        console.log("CONNECTED:", currentUser);

        return;
      }

      // MESSAGE ROUTING
      if (data.type === "message") {

        const payload = {
          type: "message",
          from: currentUser,
          text: data.text,
          createdAt: Date.now()
        };

        const targetSocket = users.get(data.to);

        // NORMAL USER MESSAGE
        if (targetSocket) {
          targetSocket.send(JSON.stringify(payload));
        }

        // SEND BACK TO SENDER
        ws.send(JSON.stringify({
          ...payload,
          self: true
        }));

        // 🚨 ADMIN AUTO REPORT SYSTEM
        // elk bericht naar ADMIN_SUPPORT gaat naar jou (server owner)
        if (data.to === "ADMIN_SUPPORT") {

          console.log("BUG REPORT:", payload);

          // hier kun je later email/webhook toevoegen
        }

        return;
      }

      // REQUEST SYSTEM
      if (data.type === "request") {

        const targetSocket = users.get(data.to);

        if (targetSocket) {

          targetSocket.send(JSON.stringify({
            type: "request",
            from: currentUser
          }));

        }

        return;
      }

    } catch (err) {
      console.log("WS ERROR:", err);
    }

  });

  ws.on("close", () => {

    if (currentUser) {
      users.delete(currentUser);
      console.log("DISCONNECTED:", currentUser);
    }

  });

});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
