const WebSocket = require("ws");

const PORT = process.env.PORT;

const wss = new WebSocket.Server({ port: PORT });

// userId -> socket
const users = {};

wss.on("connection", (ws) => {

  let userId = null;

  ws.on("message", (msg) => {

    const data = JSON.parse(msg);

    // REGISTER
    if (data.type === "register") {
      userId = data.userId;
      users[userId] = ws;
      return;
    }

    // SEND MESSAGE
    if (data.type === "message") {

      const target = users[data.to];

      if (target) {
        target.send(JSON.stringify({
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

console.log("WebSocket running on Render");
