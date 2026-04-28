const DEFAULT_DB_NAME = process.env.MONGODB_DB_NAME || "longrunner-platform";

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRequiredIndexes() {
  const trackerEventRetentionDays = parsePositiveInt(
    process.env.TRACKER_EVENT_RETENTION_DAYS,
    30,
  );

  return {
    blog_users: [
      {
        key: { username: 1 },
        options: { name: "username_1", unique: true },
      },
      {
        key: { email: 1 },
        options: { name: "email_1", unique: true },
      },
    ],
    slapp_users: [
      {
        key: { username: 1 },
        options: { name: "username_1", unique: true },
      },
      {
        key: { email: 1 },
        options: { name: "email_1", unique: true },
      },
    ],
    tracker_trackers: [
      {
        key: { ip: 1, appName: 1 },
        options: { name: "ip_1_appName_1", unique: true },
      },
      {
        key: { createdAt: 1 },
        options: {
          name: "createdAt_1",
          expireAfterSeconds: 90 * 24 * 60 * 60,
        },
      },
      {
        key: { appName: 1, updatedAt: -1 },
        options: { name: "appName_1_updatedAt_-1" },
      },
    ],
    tracker_events: [
      {
        key: { createdAt: 1 },
        options: {
          name: "createdAt_1",
          expireAfterSeconds: trackerEventRetentionDays * 24 * 60 * 60,
        },
      },
      {
        key: { appName: 1, createdAt: -1 },
        options: { name: "appName_1_createdAt_-1" },
      },
      {
        key: { ip: 1, appName: 1, createdAt: -1 },
        options: { name: "ip_1_appName_1_createdAt_-1" },
      },
    ],
    tracker_ipblocks: [
      {
        key: { ip: 1 },
        options: { name: "ip_1", unique: true },
      },
      {
        key: { blockedUntil: 1 },
        options: { name: "blockedUntil_1" },
      },
    ],
    tracker_blockevents: [
      {
        key: { ip: 1, blockedAt: -1 },
        options: { name: "ip_1_blockedAt_-1" },
      },
      {
        key: { weekKey: 1, blockLevel: 1 },
        options: { name: "weekKey_1_blockLevel_1" },
      },
      {
        key: { source: 1, weekKey: 1 },
        options: { name: "source_1_weekKey_1" },
      },
    ],
    tracker_weeklyipsummaries: [
      {
        key: { weekKey: 1, ip: 1 },
        options: { name: "weekKey_1_ip_1", unique: true },
      },
      {
        key: { weekKey: 1, lastBlockedAt: -1 },
        options: { name: "weekKey_1_lastBlockedAt_-1" },
      },
    ],
    tracker_ipblocklifecycles: [
      {
        key: { ip: 1 },
        options: { name: "ip_1", unique: true },
      },
      {
        key: { hasPermanent: 1, has24h: 1, has30m: 1 },
        options: { name: "hasPermanent_1_has24h_1_has30m_1" },
      },
    ],
    tracker_weeklysummaryemaillogs: [
      {
        key: { weekKey: 1 },
        options: { name: "weekKey_1", unique: true },
      },
    ],
    landing_sessions: [
      {
        key: { expires: 1 },
        options: { name: "expires_1", expireAfterSeconds: 0 },
      },
    ],
    blog_sessions: [
      {
        key: { expires: 1 },
        options: { name: "expires_1", expireAfterSeconds: 0 },
      },
    ],
    slapp_sessions: [
      {
        key: { expires: 1 },
        options: { name: "expires_1", expireAfterSeconds: 0 },
      },
    ],
    quiz_sessions: [
      {
        key: { expires: 1 },
        options: { name: "expires_1", expireAfterSeconds: 0 },
      },
    ],
    tracker_sessions: [
      {
        key: { expires: 1 },
        options: { name: "expires_1", expireAfterSeconds: 0 },
      },
    ],
  };
}

function buildKeySignature(key = {}) {
  return JSON.stringify(Object.entries(key));
}

function findIndexByKey(existingIndexes, key) {
  const signature = buildKeySignature(key);
  return existingIndexes.find(
    (index) => buildKeySignature(index.key) === signature,
  );
}

function isOptionMatch(existingIndex, requiredOptions = {}) {
  const existingUnique = Boolean(existingIndex.unique);
  const requiredUnique = Boolean(requiredOptions.unique);
  if (existingUnique !== requiredUnique) {
    return false;
  }

  const hasRequiredTtl = Object.prototype.hasOwnProperty.call(
    requiredOptions,
    "expireAfterSeconds",
  );
  if (!hasRequiredTtl) {
    return true;
  }

  return (
    existingIndex.expireAfterSeconds === requiredOptions.expireAfterSeconds
  );
}

async function reconcileIndexes(config = {}) {
  const {
    db,
    dbName = DEFAULT_DB_NAME,
    apply = false,
    dropConflicting = false,
    repairDuplicates = apply,
  } = config;

  if (!db) {
    throw new Error("reconcileIndexes requires db");
  }

  const requiredIndexes = getRequiredIndexes();
  const summary = [];

  for (const [collectionName, indexDefinitions] of Object.entries(
    requiredIndexes,
  )) {
    const collection = db.collection(collectionName);
    const existingIndexes = await collection.indexes().catch(() => []);

    for (const indexDefinition of indexDefinitions) {
      const existingIndex = findIndexByKey(
        existingIndexes,
        indexDefinition.key,
      );
      const optionsMatch = existingIndex
        ? isOptionMatch(existingIndex, indexDefinition.options)
        : false;

      if (existingIndex && optionsMatch) {
        summary.push({
          dbName,
          collectionName,
          indexName:
            indexDefinition.options?.name ||
            existingIndex.name ||
            buildKeySignature(indexDefinition.key),
          status: "ok",
        });
        continue;
      }

      const hasConflict = Boolean(existingIndex && !optionsMatch);
      if (!apply) {
        summary.push({
          dbName,
          collectionName,
          indexName:
            indexDefinition.options?.name ||
            buildKeySignature(indexDefinition.key),
          status: hasConflict ? "conflict" : "missing",
          existingName: existingIndex?.name || null,
        });
        continue;
      }

      if (hasConflict && dropConflicting && existingIndex?.name) {
        await collection.dropIndex(existingIndex.name);
      } else if (hasConflict) {
        summary.push({
          dbName,
          collectionName,
          indexName:
            indexDefinition.options?.name ||
            buildKeySignature(indexDefinition.key),
          status: "conflict",
          existingName: existingIndex?.name || null,
        });
        continue;
      }

      try {
        await collection.createIndex(
          indexDefinition.key,
          indexDefinition.options || {},
        );
      } catch (error) {
        const isDuplicateKeyError = error?.code === 11000;
        const shouldRepairDuplicates =
          isDuplicateKeyError &&
          Boolean(indexDefinition.options?.unique) &&
          repairDuplicates;

        if (!shouldRepairDuplicates) {
          summary.push({
            dbName,
            collectionName,
            indexName:
              indexDefinition.options?.name ||
              buildKeySignature(indexDefinition.key),
            status: "error",
            message: error?.message || "Index creation failed",
          });
          continue;
        }

        const duplicateRepairResult = await dedupeCollectionByKey({
          collection,
          key: indexDefinition.key,
        });

        await collection.createIndex(
          indexDefinition.key,
          indexDefinition.options || {},
        );

        summary.push({
          dbName,
          collectionName,
          indexName:
            indexDefinition.options?.name ||
            buildKeySignature(indexDefinition.key),
          status: "repaired_duplicates",
          duplicateGroups: duplicateRepairResult.duplicateGroups,
          deletedDocuments: duplicateRepairResult.deletedDocuments,
        });
        continue;
      }

      summary.push({
        dbName,
        collectionName,
        indexName:
          indexDefinition.options?.name ||
          buildKeySignature(indexDefinition.key),
        status: hasConflict ? "recreated" : "created",
      });
    }
  }

  const counts = summary.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {
      ok: 0,
      missing: 0,
      conflict: 0,
      created: 0,
      recreated: 0,
      repaired_duplicates: 0,
      error: 0,
    },
  );

  return {
    dbName,
    apply,
    dropConflicting,
    repairDuplicates,
    counts,
    summary,
  };
}

function toTimestamp(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function chooseDocumentToKeep(documents = []) {
  const sorted = [...documents].sort((a, b) => {
    const dateA = Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt));
    const dateB = Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt));

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    const idA = String(a._id || "");
    const idB = String(b._id || "");
    return idA < idB ? 1 : -1;
  });

  return sorted[0] || null;
}

async function dedupeCollectionByKey(config = {}) {
  const { collection, key } = config;
  const fields = Object.keys(key || {});

  if (!collection || fields.length === 0) {
    return {
      duplicateGroups: 0,
      deletedDocuments: 0,
    };
  }

  const groupId = fields.reduce((acc, fieldName) => {
    acc[fieldName] = `$${fieldName}`;
    return acc;
  }, {});

  const duplicates = await collection
    .aggregate([
      {
        $group: {
          _id: groupId,
          documents: {
            $push: {
              _id: "$_id",
              updatedAt: "$updatedAt",
              createdAt: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray();

  let deletedDocuments = 0;
  for (const duplicateGroup of duplicates) {
    const keep = chooseDocumentToKeep(duplicateGroup.documents);
    const idsToDelete = duplicateGroup.documents
      .map((doc) => doc._id)
      .filter((id) => String(id) !== String(keep?._id));

    if (idsToDelete.length === 0) {
      continue;
    }

    const result = await collection.deleteMany({
      _id: { $in: idsToDelete },
    });
    deletedDocuments += result.deletedCount || 0;
  }

  return {
    duplicateGroups: duplicates.length,
    deletedDocuments,
  };
}

export { getRequiredIndexes, reconcileIndexes };
