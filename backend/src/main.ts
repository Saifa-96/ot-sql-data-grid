import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { genData, genHeader } from "./faker-data";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

const header = genHeader();
const totalData = Array(4).fill(null).map(genData).flat();

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("init", (msg) => {
    io.emit("init", {
      header,
      rows: totalData.slice(0, 100),
      total: totalData.length,
    });
  });

  socket.on("next-page", (payload) => {
    io.emit("next-page", {
      rows: totalData.slice(payload.page - 1, 100),
      total: totalData.length,
    });
  });
});

server.listen(3009, () => {
  console.log("server running at http://localhost:3009");
});
