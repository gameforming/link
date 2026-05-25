const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// serve frontend
app.use(express.static(__dirname));

// example API
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});
