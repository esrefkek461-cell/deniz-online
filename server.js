const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    const filePath = path.join(__dirname, "index.html");

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, {
          "Content-Type": "text/plain; charset=utf-8"
        });
        res.end("index.html bulunamadı.");
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });

      res.end(data);
    });

    return;
  }

  res.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("404 - Sayfa bulunamadı");
});

const wss = new WebSocket.Server({ server });

const players = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data) {
  const message = JSON.stringify(data);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

wss.on("connection", (ws) => {

  const id = Math.random()
    .toString(36)
    .substring(2, 10);

  const player = {
    id,
    name: "Oyuncu",
    x: 2500,
    y: 2500,
    inBoat: false
  };

  players.set(id, player);

  send(ws, {
    type: "welcome",
    id,
    players: Array.from(players.values())
  });

  broadcast({
    type: "playerJoined",
    player
  });

  console.log("🌊 Oyuncu bağlandı:", id);

  ws.on("message", (message) => {

    let data;

    try {
      data = JSON.parse(message.toString());
    } catch {
      return;
    }

    const current = players.get(id);

    if (!current) return;

    if (data.type === "move") {

      if (typeof data.x === "number")
        current.x = data.x;

      if (typeof data.y === "number")
        current.y = data.y;

      if (typeof data.inBoat === "boolean")
        current.inBoat = data.inBoat;

      broadcast({
        type: "playerMoved",
        player: current
      });
    }

    if (data.type === "name") {

      if (typeof data.name === "string") {

        current.name = data.name
          .trim()
          .substring(0, 16);

        broadcast({
          type: "playerUpdated",
          player: current
        });
      }
    }

    if (data.type === "chat") {

      if (typeof data.text === "string") {

        const text = data.text
          .trim()
          .substring(0, 120);

        if (text.length > 0) {

          broadcast({
            type: "chat",
            name: current.name,
            text
          });
        }
      }
    }
  });

  ws.on("close", () => {

    players.delete(id);

    broadcast({
      type: "playerLeft",
      id
    });

    console.log("👋 Oyuncu ayrıldı:", id);
  });
});

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    "🚤 DENİZ ONLINE SERVER ÇALIŞIYOR! Port:",
    PORT
  );

});
