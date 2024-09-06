const mongoose = require("mongoose");
const Joi = require("joi");

const goalSchema = new mongoose.Schema(
  {
    goal: {
      type: String,
      required: true,
      maxlength: 50,
    },
    amount: {
      type: Number,
      required: true,
    },
    peroid: {
      type: String,
      required: true,
    },
    amountpermonth: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },


    createdBy: {
      type: String,
    },
  },
  { timestamps: true }
);

const Goal = mongoose.model("goal", goalSchema);
function validateGoal(goal) {
  const schema = {
    goal: Joi.string().required(),
    amount: Joi.number().required(),
    peroid: Joi.string().required(),
    amountpermonth: Joi.number().required(),
    category: Joi.string().required(),
  };

  return (result = Joi.validate(goal, schema));
}

module.exports.Goal = Goal;
module.exports.validateGoal = validateGoal;
