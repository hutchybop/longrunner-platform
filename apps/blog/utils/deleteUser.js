import readline from "readline";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import User from "../models/user.js";
import { Meal } from "../models/meal.js";
import { Ingredient } from "../models/ingredient.js";
import { ShoppingList } from "../models/shoppingList.js";
import { Category } from "../models/category.js";
import { loadAppEnv } from "@longrunner/shared-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: path.resolve(__dirname, "..") });

const dbName = "slapp";
const dbUrl =
  "mongodb+srv://hutch:" +
  process.env.MONGODB +
  "@hutchybop.kpiymrr.mongodb.net/" +
  dbName +
  "?retryWrites=true&w=majority&appName=hutchyBop";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function deleteUserAccount() {
  try {
    console.log("🗑️  User Account Deletion Utility\n");

    await mongoose.connect(dbUrl);
    console.log("✅ Connected to database\n");

    const email = await question("Enter email address of user to delete: ");

    if (!email || !email.includes("@")) {
      console.log("❌ Invalid email address");
      rl.close();
      return;
    }

    const user = await User.findOne({ email: email.trim() });

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      rl.close();
      return;
    }

    console.log("\n👤 User found:");
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user._id}`);

    if (user.username === "defaultMeals") {
      console.log(`\n❌ Cannot delete protected account: ${user.username}`);
      rl.close();
      return;
    }

    console.log("\n⚠️  WARNING: This will permanently delete:");
    console.log("   • User account");
    console.log("   • All meals");
    console.log("   • All ingredients");
    console.log("   • All shopping lists");
    console.log("   • All categories");
    console.log("   • All associated data");

    const confirm1 = await question('\nType "DELETE" to confirm: ');
    if (confirm1 !== "DELETE") {
      console.log("❌ Deletion cancelled");
      rl.close();
      return;
    }

    const confirm2 = await question("Are you absolutely sure? (yes/no): ");
    if (confirm2.toLowerCase() !== "yes") {
      console.log("❌ Deletion cancelled");
      rl.close();
      return;
    }

    console.log("🗑️  Deleting user data...");

    const userEmail = user.email;

    await Ingredient.deleteMany({ author: user._id });
    console.log("   ✅ Ingredients deleted");

    await Category.deleteMany({ author: user._id });
    console.log("   ✅ Categories deleted");

    await Meal.deleteMany({ author: user._id });
    console.log("   ✅ Meals deleted");

    await ShoppingList.deleteMany({ author: user._id });
    console.log("   ✅ Shopping lists deleted");

    await User.findByIdAndDelete(user._id);
    console.log("   ✅ User account deleted");

    console.log(`\n🎉 Successfully deleted account for '${userEmail}'`);
  } catch (error) {
    console.error("❌ Error during deletion:", error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    if (rl) {
      rl.close();
    }
    console.log("\n👋 Utility finished");
  }
}

deleteUserAccount().catch(console.error);
