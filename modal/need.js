const mongoose = require("mongoose");
const Joi = require("joi");

const needsAmount = new mongoose.Schema(
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

const Needs = mongoose.model("needs", needsAmount);
function validateNeeds(needs) {
  const schema = {
    amount: Joi.number().required(),
  };

  return (result = Joi.validate(needs, schema));
}

module.exports.Needs = Needs;
module.exports.validateNeeds = validateNeeds;
