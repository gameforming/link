const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

// userId -> socket
const users = {};

wss.on("connection", (ws) => {

  let userId = null;

  ws.on("message", (msg) => {

    const data = JSON.parse(msg);

    // 1. register user
    if (data.type === "register") {
      userId = data.userId;
      users[userId] = ws;
      return;
    }

    // 2. send message
    if (data.type === "message") {

      const target = users[data.to];

      if (target) {
        target.send(JSON.stringify({
          from: userId,
          message: data.message,
          createdAt: Date.now()
        }));
      }
    }

  });

  ws.on("close", () => {
    if (userId) {
      delete users[userId];
    }
  });

});

console.log("WebSocket router running");
