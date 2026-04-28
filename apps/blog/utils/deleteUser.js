import readline from "readline";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import User from "../models/user.js";
import BlogIM from "../models/blogIM.js";
import Review from "../models/review.js";
import { createMongoDbUrl, loadAppEnv } from "@longrunner/shared-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: path.resolve(__dirname, "..") });

const dbUrl = createMongoDbUrl({ appName: "blog-delete-user" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function deleteUserAccount() {
  try {
    console.log("User Account Deletion Utility\n");

    await mongoose.connect(dbUrl);
    console.log("Connected to database\n");

    const email = await question("Enter email address of user to delete: ");

    if (!email || !email.includes("@")) {
      console.log("Invalid email address");
      return;
    }

    const user = await User.findOne({ email: email.trim() });

    if (!user) {
      console.log(`No user found with email: ${email}`);
      return;
    }

    console.log("\nUser found:");
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  ID: ${user._id}`);

    const confirm1 = await question('\nType "DELETE" to confirm: ');
    if (confirm1 !== "DELETE") {
      console.log("Deletion cancelled");
      return;
    }

    const confirm2 = await question("Are you absolutely sure? (yes/no): ");
    if (confirm2.toLowerCase() !== "yes") {
      console.log("Deletion cancelled");
      return;
    }

    const reviewIds = (
      await Review.find({ author: user._id }).select({ _id: 1 }).lean()
    ).map((review) => review._id);

    if (reviewIds.length > 0) {
      await BlogIM.updateMany(
        { reviews: { $in: reviewIds } },
        { $pull: { reviews: { $in: reviewIds } } },
      );
      await Review.deleteMany({ _id: { $in: reviewIds } });
      console.log(`Deleted ${reviewIds.length} review(s)`);
    }

    await User.findByIdAndDelete(user._id);
    console.log(`Deleted user account for '${user.email}'`);
  } catch (error) {
    console.error("Error during deletion:", error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    rl.close();
  }
}

deleteUserAccount().catch(console.error);
