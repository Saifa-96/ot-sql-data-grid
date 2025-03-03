import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { OTServer } from "./ot-server";

async function setupServer() {
  const app = express();
  const server = createServer(app);

  let locked = false;
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  let ot = await OTServer.new();
  if (!ot) {
    throw Error("ot-server incurred some error");
  }

  io.on("connection", (socket) => {
    socket.on("chat message", (msg) => {
      socket.emit("chat message", msg);
    });

    socket.on("get-all-operations", () => {
      socket.emit("all-operations", ot?.operations);
    })

    socket.on("init", () => {
      socket.emit("init", ot?.toBuffer());
      socket.emit("all-operations", ot?.operations);
    });

    socket.on("send-operation", (payload) => {
      const { revision, operation } = payload;
      const curOp = ot?.receiveOperation(revision, operation);
      if (curOp) {
        socket.emit("server-ack", curOp);
        socket.broadcast.emit("apply-server", curOp);
        io.emit("all-operations", ot?.operations);
      }
    });

    socket.on("reset", async () => {
      if (locked) return;
      locked = true;
      const newOT = await OTServer.new();
      if (newOT) {
        ot = newOT;
        io.emit("reload");
      }
      locked = false;
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
