const app = require("./app");
const { syncModelFromS3 } = require("./services/awsService");
const { ensureDynamoTables } = require("./services/dynamoStore");
const { startLogWatcher, stopLogWatcher } = require("./utils/logWatcher");
const { startLogGenerator, stopLogGenerator } = require("./utils/logGenerator");

const PORT = process.env.PORT || 5000;

async function startServer() {
  await ensureDynamoTables();

  // Sync model from S3 if configured
  const modelSync = await syncModelFromS3();
  if (modelSync?.success) {
    console.log(`Model synced from S3: s3://${modelSync.bucket}/${modelSync.key}`);
  } else if (modelSync?.skipped) {
    console.log(`Model sync skipped: ${modelSync.reason}`);
  } else if (modelSync?.error) {
    console.warn(`Model sync failed, fallback to local model: ${modelSync.error}`);
  }

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`Autonomous pipeline starting...`);

    // Start log watcher after server is ready
    try {
      startLogWatcher();
      startLogGenerator().catch((error) => {
        console.error(`Failed to start log generator: ${error.message}`);
      });
    } catch (error) {
      console.error(`Failed to start log watcher: ${error.message}`);
    }
  });
}

function shutdown() {
  stopLogGenerator();
  stopLogWatcher();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});
