// /models/Envelope.js
const mongoose = require("mongoose");

const EnvelopeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    allocation: { type: Number, required: true, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    currency: { type: String, required: true, trim: true },
    budgetId: { type: mongoose.Schema.Types.ObjectId, ref: "Budget", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

EnvelopeSchema.index({ budgetId: 1, createdBy: 1, name: 1 });

module.exports = mongoose.models.Envelope || mongoose.model("Envelope", EnvelopeSchema);
