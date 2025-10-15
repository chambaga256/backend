
// models/Transaction.js
const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["expense","income"], required: true, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    note: { type: String, default: "" },
    at: { type: Date, default: () => new Date(), index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  },
  { timestamps: true }
);

TransactionSchema.post("save", async function (doc, next) {
  const Account = require("./Account");
  const delta = doc.kind === "income" ? doc.amount : -doc.amount;
  await Account.updateOne({ _id: doc.accountId, createdBy: doc.createdBy }, { $inc: { balance: delta } });
  next();
});

TransactionSchema.post("findOneAndDelete", async function (doc, next) {
  if (!doc) return next();
  const Account = require("./Account");
  const delta = doc.kind === "income" ? -doc.amount : doc.amount;
  await Account.updateOne({ _id: doc.accountId, createdBy: doc.createdBy }, { $inc: { balance: delta } });
  next();
});

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
