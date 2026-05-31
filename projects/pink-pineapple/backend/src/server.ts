import { Server } from "http";
import config from "./config";
import prisma from "./shared/prisma";
import app from "./app";
import { setupWebSocket } from "./shared/websocketSetUp";
import { notificationServices } from "./app/modules/Notification/Notification.service";

let server: Server;

// Scheduled-notification worker. Fires every 60s. Picks up any
// ScheduledNotification rows whose scheduledFor has passed and fans
// them out via the same multicast path the immediate broadcast uses.
// 60s resolution is plenty for "send tonight at 7pm" — sub-minute
// precision would just hammer Firebase + the DB.
function startNotificationScheduler() {
  setInterval(async () => {
    try {
      await notificationServices.runDueScheduled();
    } catch (e: any) {
      console.error("Scheduled notification tick failed:", e?.message || e);
    }
  }, 60_000);
}

async function startServer() {
  server = app.listen(config.port,async () => {
   await setupWebSocket(server)
    startNotificationScheduler();
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
