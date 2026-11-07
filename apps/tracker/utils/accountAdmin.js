import { mongoose } from "mongoose";
import { PasswordUtils } from "@longrunner/shared-auth";
import mail from "@longrunner/shared-utils/mail.js";

const APP_CONFIG = {
  blog: {
    domain: "blog.longrunner.co.uk",
    usersCollection: "blog_users",
    cleanup: cleanupBlogUserData,
  },
  slapp: {
    domain: "slapp.longrunner.co.uk",
    usersCollection: "slapp_users",
    cleanup: cleanupSlappUserData,
  },
};

const SEARCH_LIMIT_PER_APP = 100;

function getDbHandle() {
  const client = mongoose.connection.getClient();
  const dbName = process.env.MONGODB_DB_NAME || "longrunner-platform";
  return client.db(dbName);
}

function toObjectId(value) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error("Invalid user id");
  }
  return new mongoose.Types.ObjectId(value);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateManagedApp(app) {
  if (!APP_CONFIG[app]) {
    throw new Error("Unsupported app");
  }
  return app;
}

async function cleanupBlogUserData({ db, userId }) {
  const reviewsCollection = db.collection("blog_reviews");
  const postsCollection = db.collection("blog_posts");

  const reviewIds = (
    await reviewsCollection
      .find({ author: userId }, { projection: { _id: 1 } })
      .toArray()
  ).map((review) => review._id);

  if (reviewIds.length === 0) {
    return {
      reviewsDeleted: 0,
      postsUpdated: 0,
    };
  }

  const postUpdateResult = await postsCollection.updateMany(
    { reviews: { $in: reviewIds } },
    { $pull: { reviews: { $in: reviewIds } } },
  );

  const reviewDeleteResult = await reviewsCollection.deleteMany({
    _id: { $in: reviewIds },
  });

  return {
    reviewsDeleted: reviewDeleteResult.deletedCount || 0,
    postsUpdated: postUpdateResult.modifiedCount || 0,
  };
}

async function cleanupSlappUserData({ db, userId }) {
  const ingredientsResult = await db
    .collection("slapp_ingredients")
    .deleteMany({ author: userId });
  const categoriesResult = await db
    .collection("slapp_categories")
    .deleteMany({ author: userId });
  const mealsResult = await db.collection("slapp_meals").deleteMany({
    author: userId,
  });
  const shoppingListsResult = await db
    .collection("slapp_shoppinglists")
    .deleteMany({ author: userId });

  return {
    ingredientsDeleted: ingredientsResult.deletedCount || 0,
    categoriesDeleted: categoriesResult.deletedCount || 0,
    mealsDeleted: mealsResult.deletedCount || 0,
    shoppingListsDeleted: shoppingListsResult.deletedCount || 0,
  };
}

async function sendUpdateNotification({
  domain,
  previousUser,
  updatedUser,
  passwordChanged,
}) {
  const changedFields = [];

  if (previousUser.username !== updatedUser.username) {
    changedFields.push(
      `Username: ${previousUser.username} -> ${updatedUser.username}`,
    );
  }

  if (previousUser.email !== updatedUser.email) {
    changedFields.push(`Email: ${previousUser.email} -> ${updatedUser.email}`);
  }

  if (passwordChanged) {
    changedFields.push("Password: changed");
  }

  const changesText =
    changedFields.length > 0
      ? changedFields.join("\n")
      : "No visible account fields changed.";

  const subject = `Account details updated on ${domain}`;

  const updatedEmailText =
    "Hello,\n\n" +
    "An administrator updated your account details with the following changes:\n\n" +
    `${changesText}\n\n` +
    "If you were not expecting this, please contact hello@longrunner.co.uk";

  await mail(subject, updatedEmailText, updatedUser.email);

  if (previousUser.email !== updatedUser.email) {
    const previousEmailText =
      "Hello,\n\n" +
      "An administrator changed the email address on your account.\n\n" +
      `Previous email: ${previousUser.email}\n` +
      `New email: ${updatedUser.email}\n` +
      `Username: ${updatedUser.username}\n\n` +
      "If you did not expect this change, please contact hello@longrunner.co.uk";

    await mail(subject, previousEmailText, previousUser.email);
  }
}

async function sendDeleteNotification({ domain, user }) {
  const subject = `Account deleted on ${domain}`;
  const text =
    "Hello,\n\n" +
    "This is to confirm that your account has been deleted by an administrator.\n\n" +
    `Username: ${user.username}\n` +
    `Email: ${user.email}\n\n` +
    "If you were not expecting this, please contact hello@longrunner.co.uk";

  await mail(subject, text, user.email);
}

export async function searchManagedAccounts({ app = "all", query = "" } = {}) {
  const db = getDbHandle();
  const requestedApp = typeof app === "string" ? app : "all";
  const appsToSearch =
    requestedApp === "all"
      ? Object.keys(APP_CONFIG)
      : [validateManagedApp(requestedApp)];

  const trimmedQuery = typeof query === "string" ? query.trim() : "";
  const regex = trimmedQuery
    ? new RegExp(escapeRegex(trimmedQuery), "i")
    : null;

  const accountSets = await Promise.all(
    appsToSearch.map(async (appName) => {
      const usersCollectionName = APP_CONFIG[appName].usersCollection;
      const usersCollection = db.collection(usersCollectionName);

      const filter = regex
        ? {
            $or: [{ username: regex }, { email: regex }],
          }
        : {};

      const users = await usersCollection
        .find(filter, { projection: { username: 1, email: 1 } })
        .sort({ username: 1 })
        .limit(SEARCH_LIMIT_PER_APP)
        .toArray();

      return users.map((user) => ({
        app: appName,
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      }));
    }),
  );

  return accountSets.flat().sort((a, b) => {
    if (a.app !== b.app) {
      return a.app.localeCompare(b.app);
    }
    return a.username.localeCompare(b.username);
  });
}

export async function updateManagedAccount({
  app,
  userId,
  username,
  email,
  password,
  notify = false,
}) {
  const managedApp = validateManagedApp(app);
  const db = getDbHandle();
  const appConfig = APP_CONFIG[managedApp];
  const usersCollection = db.collection(appConfig.usersCollection);
  const objectId = toObjectId(userId);

  const nextUsername = typeof username === "string" ? username.trim() : "";
  const nextEmail = typeof email === "string" ? email.trim() : "";

  if (!nextUsername || !nextEmail) {
    throw new Error("Username and email are required");
  }

  const previousUser = await usersCollection.findOne(
    { _id: objectId },
    { projection: { username: 1, email: 1 } },
  );

  if (!previousUser) {
    throw new Error("User account not found");
  }

  const duplicateEmail = await usersCollection.findOne({
    email: nextEmail,
    _id: { $ne: objectId },
  });
  if (duplicateEmail) {
    throw new Error("Email already registered");
  }

  const duplicateUsername = await usersCollection.findOne({
    username: nextUsername,
    _id: { $ne: objectId },
  });
  if (duplicateUsername) {
    throw new Error("Username already taken");
  }

  const setDoc = {
    username: nextUsername,
    email: nextEmail,
  };

  const nextPassword = typeof password === "string" ? password.trim() : "";
  const passwordChanged = nextPassword.length > 0;
  if (passwordChanged) {
    setDoc.password = await PasswordUtils.hashPassword(nextPassword);
  }

  await usersCollection.updateOne({ _id: objectId }, { $set: setDoc });

  const updatedUser = await usersCollection.findOne(
    { _id: objectId },
    { projection: { username: 1, email: 1 } },
  );

  if (!updatedUser) {
    throw new Error("Failed to load updated user");
  }

  if (notify) {
    await sendUpdateNotification({
      domain: appConfig.domain,
      previousUser,
      updatedUser,
      passwordChanged,
    });
  }

  return {
    app: managedApp,
    username: updatedUser.username,
    email: updatedUser.email,
    passwordChanged,
  };
}

export async function deleteManagedAccount({ app, userId, notify = false }) {
  const managedApp = validateManagedApp(app);
  const db = getDbHandle();
  const appConfig = APP_CONFIG[managedApp];
  const usersCollection = db.collection(appConfig.usersCollection);
  const objectId = toObjectId(userId);

  const user = await usersCollection.findOne(
    { _id: objectId },
    { projection: { username: 1, email: 1 } },
  );

  if (!user) {
    throw new Error("User account not found");
  }

  if (user.username === "defaultMeals") {
    throw new Error("defaultMeals account cannot be deleted here");
  }

  const cleanupStats = await appConfig.cleanup({ db, userId: objectId });
  const deleteResult = await usersCollection.deleteOne({ _id: objectId });

  if (!deleteResult.deletedCount) {
    throw new Error("Failed to delete user account");
  }

  if (notify) {
    await sendDeleteNotification({
      domain: appConfig.domain,
      user,
    });
  }

  return {
    app: managedApp,
    username: user.username,
    email: user.email,
    cleanupStats,
  };
}

export const MANAGED_ACCOUNT_APPS = Object.keys(APP_CONFIG);
