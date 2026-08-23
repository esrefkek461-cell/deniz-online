const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🌊 DENİZ ONLINE SERVER AKTİF!");
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

  const id =
    Math.random().toString(36).substring(2, 10);

  const player = {
    id: id,
    name: "Oyuncu",
    x: 2500,
    y: 2500,
    inBoat: false
  };

  players.set(id, player);

  // Yeni oyuncuya kendi bilgilerini gönder
  send(ws, {
    type: "welcome",
    id: id,
    players: Array.from(players.values())
  });

  // Diğer oyunculara yeni oyuncuyu bildir
  broadcast({
    type: "playerJoined",
    player: player
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

    // Oyuncu hareketi
    if (data.type === "move") {

      if (typeof data.x === "number") {
        current.x = data.x;
      }

      if (typeof data.y === "number") {
        current.y = data.y;
      }

      if (typeof data.inBoat === "boolean") {
        current.inBoat = data.inBoat;
      }

      broadcast({
        type: "playerMoved",
        player: current
      });
    }

    // İsim değiştirme
    if (data.type === "name") {

      if (typeof data.name === "string") {

        current.name =
          data.name
            .trim()
            .substring(0, 16);

        broadcast({
          type: "playerUpdated",
          player: current
        });

      }
    }

    // Sohbet
    if (data.type === "chat") {

      if (typeof data.text === "string") {

        const text =
          data.text
            .trim()
            .substring(0, 120);

        if (text.length > 0) {

          broadcast({
            type: "chat",
            name: current.name,
            text: text
          });

        }
      }
    }
  });

  ws.on("close", () => {

    players.delete(id);

    broadcast({
      type: "playerLeft",
      id: id
    });

    console.log("👋 Oyuncu ayrıldı:", id);
  });

});

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    "🚤 DENİZ ONLINE SERVER ÇALIŞIYOR!"
  );

  console.log(
    "Port:",
    PORT
  );

});
