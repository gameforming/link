const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

// userId -> socket
const users = {};

wss.on("connection", (ws) => {

  let userId = null;

  ws.on("message", (msg) => {

    const data = JSON.parse(msg);

    // REGISTER USER
    if (data.type === "register") {
      userId = data.userId;
      users[userId] = ws;
      return;
    }

    // SEND MESSAGE
    if (data.type === "message") {

      const targetSocket = users[data.to];

      if (targetSocket) {
        targetSocket.send(JSON.stringify({
          type: "message",
          from: userId,
          text: data.text,
          createdAt: Date.now()
        }));
      }
    }

  });

  ws.on("close", () => {
    if (userId) delete users[userId];
  });

});

console.log("WebSocket server running");
