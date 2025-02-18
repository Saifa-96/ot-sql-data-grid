import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { OTServer } from "./ot-server";

async function setupServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
    },
  });

  const ot = await OTServer.new();
  const __dirname = dirname(fileURLToPath(import.meta.url));

  app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
  });

  io.on("connection", (socket) => {
    socket.on("chat message", (msg) => {
      socket.emit("chat message", msg);
    });

    socket.on("init", (msg) => {
      socket.emit("init", ot.toBuffer());
    });

    socket.on("send-operation", (payload) => {
      const { revision, operation } = payload;
      const curOp = ot.receiveOperation(revision, operation);
      socket.emit("server-ack", curOp);
      socket.broadcast.emit("apply-server", curOp);
    });
  });

  server.listen(3009, () => {
    console.log("server running at http://localhost:3009");
  });
}

function main() {
  setupServer();
}
main();
