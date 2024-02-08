const mongoose = require("mongoose");
const Joi = require("joi");

const savingsAmount = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },

    createdBy: {
      type: String,
    },
  },
  { timestamps: true }
);

const Savings = mongoose.model("savings", savingsAmount);
function validateSavings(savings) {
  const schema = {
    amount: Joi.number().required(),
  };

  return (result = Joi.validate(savings, schema));
}

module.exports.Savings = Savings;
module.exports.validateSavings = validateSavings;
