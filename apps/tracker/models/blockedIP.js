import mongoose from "mongoose";

const Schema = mongoose.Schema;

const BlockedIPSchema = new Schema({
  blockedIPArray: [{ type: String }],
});

const BlockedIP = mongoose.model("BlockedIP", BlockedIPSchema);

export default BlockedIP;
