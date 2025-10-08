const mongoose = require("mongoose");
const Joi = require("joi");

// Define schema correctly
const mySavingsSchema = new mongoose.Schema(
  {
    savingName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: String,
      default: "system",
    },
  },
  { timestamps: true }
);

// Create model
const MySavings = mongoose.model("MySavings", mySavingsSchema);

// Validate with Joi
function validateSavings(savings) {
  const schema = Joi.object({
    savingName: Joi.string().required(),
    amount: Joi.number().required(),
    createdBy: Joi.string().optional(),
  });

  return schema.validate(savings);
}

module.exports = { MySavings, validateSavings };
