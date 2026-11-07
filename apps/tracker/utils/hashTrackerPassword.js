import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import { mongoose } from "mongoose";
import { PasswordUtils } from "@longrunner/shared-auth";
import { createMongoDbUrl, loadAppEnv } from "@longrunner/shared-config";
import TrackerUser from "../models/trackerUser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: path.resolve(__dirname, "..") });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function run() {
  try {
    console.log("Tracker password hash utility\n");

    const username = (await question("Username (optional): ")).trim();
    const password = await question("Password to hash: ");
    const confirmPassword = await question("Confirm password: ");

    if (!password) {
      console.log("\nPassword is required.");
      return;
    }

    if (password !== confirmPassword) {
      console.log("\nPasswords do not match.");
      return;
    }

    const hash = await PasswordUtils.hashPassword(password);

    console.log("\nHash generated:\n");
    console.log(hash);

    if (username) {
      console.log("\nMongoDB document example:\n");
      console.log(
        JSON.stringify(
          {
            username,
            password: hash,
          },
          null,
          2,
        ),
      );

      const shouldInsert = (
        await question(
          "\nAdd this user to tracker_users now? (yes/no, default: no): ",
        )
      )
        .trim()
        .toLowerCase();

      if (shouldInsert === "yes" || shouldInsert === "y") {
        const dbUrl = createMongoDbUrl({ appName: "tracker-hash-password" });
        await mongoose.connect(dbUrl);

        const existingUser = await TrackerUser.findOne({ username });
        if (existingUser) {
          console.log(
            `\nUser '${username}' already exists in tracker_users. No new user added.`,
          );
          return;
        }

        await TrackerUser.create({ username, password: hash });
        console.log(
          `\nUser '${username}' added to tracker_users successfully.`,
        );
      }
    }
  } catch (error) {
    console.error("\nFailed to generate hash:", error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    rl.close();
  }
}

run().catch((error) => {
  console.error(error);
  rl.close();
});
