// Copies the shoppinglist db into a new db called slapp
// To run check .env
// Note: This is a MongoDB shell script - db and print are global MongoDB shell variables

/* global db, print */

const sourceDB = "shoppinglist"; // Source database name
const targetDB = "slapp"; // Target database name

// Get a list of all collections in the source database
const collections = db.getSiblingDB(sourceDB).getCollectionNames();

// Loop through each collection and copy it to the target database
collections.forEach((collectionName) => {
  const documents = db
    .getSiblingDB(sourceDB)
    .getCollection(collectionName)
    .find()
    .toArray(); // Fetch documents

  if (documents.length > 0) {
    db.getSiblingDB(targetDB)
      .getCollection(collectionName)
      .insertMany(documents); // Insert documents into the target collection
    print(
      `Copied ${documents.length} documents from ${sourceDB}.${collectionName} to ${targetDB}.${collectionName}`,
    );
  } else {
    print(`Collection ${sourceDB}.${collectionName} is empty, skipping...`);
  }
});

print(`Database copied from ${sourceDB} to ${targetDB}`);
