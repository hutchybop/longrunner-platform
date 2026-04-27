import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { createMongoDbUrl, loadAppEnv } from "@longrunner/shared-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: path.resolve(__dirname, "..") });

const TARGET_DB_NAME = process.env.MONGODB_DB_NAME || "longrunner-platform";
const BULK_SIZE = 500;

const LEGACY_MAPPINGS = [
  {
    sourceDb: "blog",
    collections: [
      { source: "users", target: "blog_users" },
      { source: "blogims", target: "blog_posts" },
      { source: "reviews", target: "blog_reviews" },
      { source: "sessions", target: "blog_sessions" },
      { source: "sessions", target: "landing_sessions" },
    ],
  },
  {
    sourceDb: "slapp",
    collections: [
      { source: "users", target: "slapp_users" },
      { source: "meals", target: "slapp_meals" },
      { source: "ingredients", target: "slapp_ingredients" },
      { source: "categories", target: "slapp_categories" },
      { source: "shoppinglists", target: "slapp_shoppinglists" },
      { source: "sessions", target: "slapp_sessions" },
    ],
  },
  {
    sourceDb: "quiz",
    collections: [
      { source: "quizzes", target: "quiz_quizzes" },
      { source: "questions", target: "quiz_questions" },
      { source: "sessions", target: "quiz_sessions" },
    ],
  },
  {
    sourceDb: "longrunnerTracker",
    collections: [
      { source: "trackers", target: "tracker_trackers" },
      { source: "trackerevents", target: "tracker_events" },
      { source: "ipblocks", target: "tracker_ipblocks" },
      { source: "trackerblockevents", target: "tracker_blockevents" },
      {
        source: "trackerweeklyipsummaries",
        target: "tracker_weeklyipsummaries",
      },
      {
        source: "trackeripblocklifecycles",
        target: "tracker_ipblocklifecycles",
      },
      {
        source: "trackerweeklysummaryemaillogs",
        target: "tracker_weeklysummaryemaillogs",
      },
      { source: "sessions", target: "tracker_sessions" },
    ],
  },
];

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes("--apply"),
  };
}

async function copyCollection({ sourceCollection, targetCollection, apply }) {
  const sourceCount = await sourceCollection.countDocuments();
  const targetCountBefore = await targetCollection.countDocuments();

  if (!apply || sourceCount === 0) {
    return {
      sourceCount,
      targetCountBefore,
      upsertedCount: 0,
      modifiedCount: 0,
    };
  }

  const cursor = sourceCollection.find({});
  let operations = [];
  let upsertedCount = 0;
  let modifiedCount = 0;

  async function flush() {
    if (operations.length === 0) {
      return;
    }

    const result = await targetCollection.bulkWrite(operations, {
      ordered: false,
    });

    upsertedCount += result.upsertedCount || 0;
    modifiedCount += result.modifiedCount || 0;
    operations = [];
  }

  for await (const doc of cursor) {
    operations.push({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    });

    if (operations.length >= BULK_SIZE) {
      await flush();
    }
  }

  await flush();

  return {
    sourceCount,
    targetCountBefore,
    upsertedCount,
    modifiedCount,
  };
}

async function migrateUnifiedDatabase({ apply = false } = {}) {
  const dbUrl = createMongoDbUrl({ dbName: TARGET_DB_NAME });
  await mongoose.connect(dbUrl);

  const client = mongoose.connection.getClient();
  const targetDb = client.db(TARGET_DB_NAME);
  const summary = [];

  for (const dbMapping of LEGACY_MAPPINGS) {
    const sourceDb = client.db(dbMapping.sourceDb);
    const existingCollections = new Set(
      (await sourceDb.listCollections({}, { nameOnly: true }).toArray()).map(
        (collection) => collection.name,
      ),
    );

    for (const collectionMapping of dbMapping.collections) {
      const sourceExists = existingCollections.has(collectionMapping.source);
      const sourceCollection = sourceDb.collection(collectionMapping.source);
      const targetCollection = targetDb.collection(collectionMapping.target);

      const result = sourceExists
        ? await copyCollection({
            sourceCollection,
            targetCollection,
            apply,
          })
        : {
            sourceCount: 0,
            targetCountBefore: await targetCollection.countDocuments(),
            upsertedCount: 0,
            modifiedCount: 0,
          };

      summary.push({
        sourceDb: dbMapping.sourceDb,
        sourceCollection: collectionMapping.source,
        targetDb: TARGET_DB_NAME,
        targetCollection: collectionMapping.target,
        sourceExists,
        ...result,
      });
    }
  }

  return {
    apply,
    targetDbName: TARGET_DB_NAME,
    summary,
  };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const args = parseArgs();

  migrateUnifiedDatabase(args)
    .then((result) => {
      console.log(
        JSON.stringify(
          {
            mode: result.apply ? "apply" : "dry-run",
            targetDbName: result.targetDbName,
            summary: result.summary,
          },
          null,
          2,
        ),
      );
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    });
}

export { migrateUnifiedDatabase };
