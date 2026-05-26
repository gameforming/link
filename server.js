const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// =========================
// CONFIG
// =========================

const MAX_USERS = 40;
const ADMIN_USER = "Sem Bijlsma";

// username -> socket
const users = new Map();

// =========================
// FRONTEND SERVE
// =========================

app.use(express.static(path.join(__dirname)));

app.get("/api/ping", (req, res) => {
  res.json({
    ok: true,
    users: users.size
  });
});

// =========================
// WEBSOCKET
// =========================

wss.on("connection", (ws) => {

  let currentUser = null;

  ws.on("message", (raw) => {

    try {

      const data = JSON.parse(raw);

      // =========================
      // REGISTER
      // =========================

      if (data.type === "register") {

        const username = data.userId;

        if (!username || !username.trim()) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Invalid username"
          }));
          return;
        }

        // ❌ duplicate username block
        if (users.has(username)) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Username already taken"
          }));
          return;
        }

        if (users.size >= MAX_USERS) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Server full"
          }));
          return;
        }

        currentUser = username;
        users.set(username, ws);

        ws.send(JSON.stringify({
          type: "registered",
          userId: username
        }));

        console.log("CONNECTED:", username);

        // notify admin
        const adminSocket = users.get(ADMIN_USER);

        if (adminSocket) {
          adminSocket.send(JSON.stringify({
            type: "message",
            from: "SYSTEM",
            text: `${username} joined`,
            createdAt: Date.now()
          }));
        }

        return;
      }

      // =========================
      // MESSAGE
      // =========================

      if (data.type === "message") {

        const payload = {
          type: "message",
          from: currentUser,
          text: data.text,
          createdAt: Date.now()
        };

        const targetSocket = users.get(data.to);

        // send to receiver
        if (targetSocket) {
          targetSocket.send(JSON.stringify(payload));
        }

        // send back to sender
        ws.send(JSON.stringify({
          ...payload,
          self: true
        }));

        // =========================
        // ADMIN SUPPORT ROUTING
        // =========================

        if (data.to === "ADMIN_SUPPORT") {

          const adminSocket = users.get(ADMIN_USER);

          if (adminSocket) {
            adminSocket.send(JSON.stringify({
              type: "message",
              from: "ADMIN_SUPPORT",
              text: data.text,
              createdAt: Date.now()
            }));
          }

          console.log("BUG REPORT:", payload);
        }

        return;
      }

      // =========================
      // REQUEST
      // =========================

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

  // =========================
  // DISCONNECT
  // =========================

  ws.on("close", () => {

    if (currentUser) {

      users.delete(currentUser);

      console.log("DISCONNECTED:", currentUser);

      const adminSocket = users.get(ADMIN_USER);

      if (adminSocket) {
        adminSocket.send(JSON.stringify({
          type: "message",
          from: "SYSTEM",
          text: `${currentUser} left`,
          createdAt: Date.now()
        }));
      }
    }

  });

});

// =========================
// START SERVER
// =========================

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
