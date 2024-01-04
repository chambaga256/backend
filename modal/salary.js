const mongoose = require("mongoose");
const Joi = require("joi");

const incomeSalary = new mongoose.Schema(
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

const Salary = mongoose.model("salary", incomeSalary);
function validateSalary(salary) {
  const schema = {
    income: Joi.string().required(),
    amount: Joi.number().required(),
   
  };

  return (result = Joi.validate(salary, schema));
}

module.exports.Salary = Salary;
module.exports.validateSalary= validateSalary;
