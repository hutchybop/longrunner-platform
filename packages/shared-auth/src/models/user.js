import mongoose from "mongoose";
import crypto from "crypto";
import { Buffer } from "buffer";
import PasswordUtils from "../utils/passwordUtils.js";
import mail from "@longrunner/shared-utils/mail.js";

const Schema = mongoose.Schema;

export function createUserSchema(config = {}) {
  const {
    hasRole = false,
    hasResetPasswordUsed = false,
    roleEnum = ["user"],
    roleDefault = "user",
  } = config;

  const schemaDefinition = {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      select: false,
    },
    hash: {
      type: String,
      select: false,
    },
    salt: {
      type: String,
      select: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  };

  if (hasResetPasswordUsed) {
    schemaDefinition.resetPasswordUsed = Boolean;
  }

  if (hasRole) {
    schemaDefinition.role = {
      type: String,
      enum: roleEnum,
      default: roleDefault,
    };
  }

  const UserSchema = new Schema(schemaDefinition);

  function isPassportLocalHash(hash, salt) {
    return (
      hash &&
      salt &&
      hash.length === 1024 &&
      salt.length === 64 &&
      /^[0-9a-f]+$/i.test(hash) &&
      /^[0-9a-f]+$/i.test(salt)
    );
  }

  async function verifyPassportHash(password, salt, hash) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 25000, 512, "sha256", (err, derivedKey) => {
        if (err) return reject(err);
        const isValid = crypto.timingSafeEqual(
          Buffer.from(hash, "hex"),
          derivedKey,
        );
        resolve(isValid);
      });
    });
  }

  async function countRemainingPassportUsers() {
    const UserModel = mongoose.model("User");
    const count = await UserModel.countDocuments({
      hash: { $exists: true },
      salt: { $exists: true },
    });
    return count;
  }

  async function sendMigrationProgressEmail(migratedCount, remainingCount) {
    const subject = `Password Migration Progress: ${remainingCount} users remaining`;
    const text =
      `Hello,\n\n` +
      `Password migration progress update:\n\n` +
      `Users migrated to bcrypt: ${migratedCount}\n` +
      `Users remaining (passport format): ${remainingCount}\n\n` +
      `Migration is happening automatically as users log in.\n\n` +
      `When migration is complete, you can clean up the old passport fields.`;

    await mail(subject, text, process.env.EMAIL_USER);
  }

  UserSchema.statics.register = async function (user, password) {
    const hashedPassword = await PasswordUtils.hashPassword(password);
    user.password = hashedPassword;
    return await user.save();
  };

  UserSchema.methods.authenticate = async function (password) {
    const UserModel = mongoose.model("User");
    const userWithFields = await UserModel.findById(this._id).select(
      "+password +hash +salt",
    );

    if (!userWithFields) {
      return { user: false };
    }

    if (
      userWithFields.hash &&
      userWithFields.salt &&
      isPassportLocalHash(userWithFields.hash, userWithFields.salt)
    ) {
      const isValid = await verifyPassportHash(
        password,
        userWithFields.salt,
        userWithFields.hash,
      );

      if (isValid) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          await this.setPassword(password);

          const UserModel = mongoose.model("User");
          await UserModel.findByIdAndUpdate(
            this._id,
            {
              $unset: { hash: 1, salt: 1 },
            },
            { session },
          );

          await session.commitTransaction();
          session.endSession();

          const remainingCount = await countRemainingPassportUsers();
          const totalUsers = await UserModel.countDocuments();
          const migratedCount = totalUsers - remainingCount;

          await sendMigrationProgressEmail(migratedCount, remainingCount);

          return { user: this, migrated: true };
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
        }
      }
      return { user: false };
    }

    if (!userWithFields.password) {
      return { user: false };
    }

    const isValid = await PasswordUtils.comparePassword(
      password,
      userWithFields.password,
    );
    return isValid ? { user: this } : { user: false };
  };

  UserSchema.pre("save", function () {
    if (this.isModified("password")) {
      this.hash = undefined;
      this.salt = undefined;
    }
  });

  UserSchema.methods.setPassword = async function (password) {
    this.password = await PasswordUtils.hashPassword(password);
    return this.save();
  };

  return mongoose.models.User || mongoose.model("User", UserSchema);
}

export default createUserSchema;
