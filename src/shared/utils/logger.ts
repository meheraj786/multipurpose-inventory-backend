import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard", // This handles the simple Date/Time
            ignore: "pid,hostname,req,res,responseTime", // Kills all the extra JSON
          },
        }
      : undefined,
});
