// /models/Budget.js
const mongoose = require("mongoose");

const BudgetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    currency: { type: String, required: true, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    targetSavings: { type: Number, default: 0 },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    closed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

BudgetSchema.index({ createdBy: 1, periodStart: 1, periodEnd: 1 });

module.exports = mongoose.models.Budget || mongoose.model("Budget", BudgetSchema);
