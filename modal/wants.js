const mongoose = require("mongoose");
const Joi = require("joi");

const wantsAmount = new mongoose.Schema(
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

const Wants = mongoose.model("wants", wantsAmount);
function validateWants(wants) {
  const schema = {
    amount: Joi.number().required(),
  };

  return (result = Joi.validate(wants, schema));
}

module.exports.Wants = Wants;
module.exports.validateWants = validateWants;
