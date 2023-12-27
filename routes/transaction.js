const express = require("express");
const { Transaction, validateTransaction } = require("../modal/transaction");

const router = express.Router();

router.post("/create", async (req, res) => {
  // validate incoming data
  const { error } = validateTransaction(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // send transaction
  const transaction = await Transaction.save(req.body);

  if (transaction) return res.status(200).send(transaction);
});
