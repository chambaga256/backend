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
      type: Number,
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
    peroid: Joi.number().required(),
  };

  return (result = Joi.validate(goal, schema));
}

module.exports.Goal = Goal;
module.exports.validateGoal = validateGoal;
