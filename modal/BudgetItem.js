const mongoose = require("mongoose");

const BudgetItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
  month: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/, // Matches format YYYY-MM
    default: () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    },
  },
  createdBy: {
    type: String,
  },
}, {
  timestamps: true,
});

const BudgetItem = mongoose.model("BudgetItem", BudgetItemSchema);

module.exports = BudgetItem;
