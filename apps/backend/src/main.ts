import express from "express";
import cors from "cors";
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
    maxHttpBufferSize: 1024 * 1024 * 1024,
  });

  let ot = await OTServer.new();
  if (!ot) {
    throw Error("ot-server incurred some error");
    return;
  }

  app.get("/database", cors(), (_req, res) => {
    res.setHeader("Content-Type", "application/octet-stream");
    const buffer = Buffer.from(ot?.toBuffer()!);
    res.send(buffer);
  });

  io.on("connection", (socket) => {
    const connectionCount = io.engine.clientsCount;
    socket.broadcast.emit("connection-count", connectionCount);

    socket.on("get-connection-count", () => {
      const connectionCount = io.engine.clientsCount;
      socket.emit("connection-count", connectionCount);
    });

    socket.on("disconnect", () => {
      socket.broadcast.emit("connection-count", io.engine.clientsCount);
    });

    socket.on("get-all-operations", () => {
      socket.emit("all-operations", ot?.operations);
    });

    socket.on("send-operation", (payload) => {
      const start = performance.now();
      const { revision, operation } = payload;
      const result = ot?.validateOperation(operation);
      console.log(result);
      if (result) {
        const curtOp = ot?.receiveOperation(revision, result.operation);
        socket.emit("server-ack", result.identityRecord);
        socket.broadcast.emit("apply-server", curtOp);
        socket.emit("all-operations", ot?.operations);
        console.log("Operation applied successfully", curtOp);
      }
      const end = performance.now();
      console.log("Performance test took: ", end - start, "ms");
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
