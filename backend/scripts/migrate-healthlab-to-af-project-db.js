/**
 * One-time migration: Move all collections from a source DB to af_project_db.
 * Preserves documents, collection names, and indexes. On _id conflict, inserts without _id.
 *
 * Run: MIGRATE_SOURCE_DB=<sourceDbName> node scripts/migrate-healthlab-to-af-project-db.js
 * Requires: MONGODB_URI and MIGRATE_SOURCE_DB in .env (or env)
 */

const { MongoClient } = require("mongodb");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const SOURCE_DB = process.env.MIGRATE_SOURCE_DB;
const TARGET_DB = "af_project_db";

if (!SOURCE_DB) {
  console.error("❌ Set MIGRATE_SOURCE_DB to the source database name for this one-time migration.");
  process.exit(1);
}

const COLLECTIONS_TO_MIGRATE = [
  "experiments",
  "participants",
  "posts",
  "reports",
  "researchers",
  "reviews",
  "users",
];

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    console.log(`\n📦 Migration: ${SOURCE_DB} → ${TARGET_DB}\n`);

    for (const collName of COLLECTIONS_TO_MIGRATE) {
      const sourceColl = sourceDb.collection(collName);
      const targetColl = targetDb.collection(collName);

      const exists = await sourceDb
        .listCollections({ name: collName })
        .hasNext();
      if (!exists) {
        console.log(`⏭️  ${collName}: does not exist in source, skipping.`);
        continue;
      }

      const countBefore = await sourceColl.countDocuments();
      console.log(`\n--- ${collName} (${countBefore} documents) ---`);

      let inserted = 0;
      let duplicateId = 0;
      let errors = 0;

      const cursor = sourceColl.find({});
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        try {
          await targetColl.insertOne(doc);
          inserted++;
        } catch (e) {
          if (e.code === 11000) {
            duplicateId++;
            const { _id, ...rest } = doc;
            try {
              await targetColl.insertOne(rest);
              inserted++;
            } catch (e2) {
              errors++;
              console.error(`  Error re-inserting doc in ${collName}:`, e2.message);
            }
          } else {
            errors++;
            console.error(`  Error inserting doc in ${collName}:`, e.message);
          }
        }
      }

      console.log(`  Inserted: ${inserted}, duplicate _id handled: ${duplicateId}, errors: ${errors}`);

      // Recreate indexes (excluding _id)
      const indexes = await sourceColl.indexes();
      for (const idx of indexes) {
        if (idx.name === "_id_") continue;
        try {
          const keys = idx.key;
          const options = { name: idx.name };
          if (idx.unique) options.unique = true;
          if (idx.expireAfterSeconds != null) options.expireAfterSeconds = idx.expireAfterSeconds;
          await targetColl.createIndex(keys, options);
          console.log(`  Index created: ${idx.name}`);
        } catch (e) {
          if (e.code === 85 || e.code === 86) {
            console.log(`  Index ${idx.name} already exists or equivalent, skipping.`);
          } else {
            console.warn(`  Could not create index ${idx.name}:`, e.message);
          }
        }
      }
    }

    console.log("\n✅ Migration completed. Verify data in Atlas, then you can drop the source DB if desired.\n");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.close();
    process.exit(0);
  }
}

migrate();
