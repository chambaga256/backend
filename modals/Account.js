// models/Account.js
const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    institution: { type: String, default: "" },
    type: { type: String, enum: ["Checking","Savings","Mobile Money","Credit Card","Cash","Investment"], required: true, index: true },
    currency: { type: String, required: true },
    balance: { type: Number, default: 0 },
    color: { type: String, default: "#2563EB" },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  },
  { timestamps: true }
);

AccountSchema.index({ name: "text", institution: "text" });

module.exports = mongoose.models.Account || mongoose.model("Account", AccountSchema);
