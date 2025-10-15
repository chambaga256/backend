const mongoose = require("mongoose");
const Joi = require("joi");

const weeklyIncome= new mongoose.Schema(
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

const WeeklyIncome = mongoose.model("weeklycome", weeklyIncome);
function validateWeeklyIncome(WeeklyIncome) {
  const schema = {
    amount: Joi.number().required(),
  };

  return (result = Joi.validate(WeeklyIncome, schema));
}

module.exports.WeeklyIncome  = WeeklyIncome 
module.exports.validateWeeklyIncome = validateWeeklyIncome;
