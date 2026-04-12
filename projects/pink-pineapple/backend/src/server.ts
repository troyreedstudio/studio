import { Server } from "http";
import config from "./config";
import prisma from "./shared/prisma";
import app from "./app";
import { setupWebSocket } from "./shared/websocketSetUp";

let server: Server;

async function startServer() {
  server = app.listen(config.port,async () => {
   await setupWebSocket(server)
    console.log("Server is listiening on port ", config.port);
  });
}

async function main() {
  await startServer();
  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info("Server closed!");
        process.exit(0);
      });
    } else {
      process.exit(1);
    }
  };

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception: ", error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.error("Unhandled Rejection: ", error);
    exitHandler();
  });

  process.on("SIGTERM", () => {
    console.info("SIGTERM signal received. Shutting down gracefully...");
    exitHandler();
  });

  process.on("SIGINT", () => {
    console.info("SIGINT signal received. Shutting down gracefully...");
    exitHandler();
  });
}

main();
