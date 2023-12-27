const mongoose = require("mongoose");
const Joi = require("joi");

const transactionSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: true,
      maxlength: 50,
    },
    amount: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
function validateTransaction(transaction) {
  const schema = {
    item: Joi.string().required(),
    amount: Joi.string().required(),
    quantity: Joi.string().required(),
  };

  return (result = Joi.validate(transaction, schema));
}

module.exports.Transaction = Transaction;
module.exports.validateTransaction = validateTransaction;