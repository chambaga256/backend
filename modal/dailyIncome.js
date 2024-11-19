const mongoose = require("mongoose");
const Joi = require("joi");

const dailyIncome= new mongoose.Schema(
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

const DailyIncome = mongoose.model("dailycome", dailyIncome);
function validateDailyIncome(DailyIncome) {
  const schema = {
    amount: Joi.number().required(),
  };

  return (result = Joi.validate(DailyIncome, schema));
}

module.exports.DailyIncome  = DailyIncome
module.exports.validateDailyIncome = validateDailyIncome;
