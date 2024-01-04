const mongoose = require("mongoose");
const Joi = require("joi");

const incomeSchema = new mongoose.Schema(
  {
    income: {
      type: String,
      required: true,
      maxlength: 50,
    },
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

const Income = mongoose.model("Income", incomeSchema);
function validateIncome(income) {
  const schema = {
    income: Joi.string().required(),
    amount: Joi.number().required(),
   
  };

  return (result = Joi.validate(income, schema));
}

module.exports.Income = Income;
module.exports.validateIncome = validateIncome;
