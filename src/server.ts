import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { env } from "./config/env.js";
// import { connectDatabase } from "./config/database";

const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 http://localhost:${env.PORT}/api/${env.API_VERSION}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
