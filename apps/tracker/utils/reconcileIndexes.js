import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { createMongoDbUrl, loadAppEnv } from "@longrunner/shared-config";
import { reconcileIndexes } from "./indexMaintenance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: path.resolve(__dirname, "..") });

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes("--apply"),
    dropConflictingIndexes: argv.includes("--drop-conflicting-indexes"),
  };
}

async function runReconcileIndexes({
  apply = false,
  dropConflictingIndexes = false,
} = {}) {
  const dbUrl = createMongoDbUrl({ appName: "tracker-reconcile-indexes" });
  await mongoose.connect(dbUrl);

  const dbName = process.env.MONGODB_DB_NAME || "longrunner-platform";
  const client = mongoose.connection.getClient();
  const db = client.db(dbName);

  const result = await reconcileIndexes({
    db,
    dbName,
    apply,
    dropConflicting: apply && dropConflictingIndexes,
  });

  return result;
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const args = parseArgs();

  runReconcileIndexes(args)
    .then((result) => {
      console.log(
        JSON.stringify(
          {
            mode: result.apply ? "apply" : "dry-run",
            dbName: result.dbName,
            counts: result.counts,
            summary: result.summary,
          },
          null,
          2,
        ),
      );
    })
    .catch((error) => {
      console.error("Index reconciliation failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    });
}

export { runReconcileIndexes };
