const express = require("express");
const { Transaction, validateTransaction } = require("../modals/Transaction");
const { decodeToken } = require("../helpers/auth");

const router = express.Router();

// return summary of transactions
router.get("/summary", async (req, res) => {
  try {
    const token = req.header("Authorization");
    let transactions;

    if (!token) {
      // return all transactions for admin
      transactions = await Transaction.find();
    } else {
      // return all transactions for logged in user
      const decodedToken = decodeToken(token);
      transactions = await Transaction.find({ createdBy: decodedToken._id });
    }

    // Calculate total amount
    const totalAmount = transactions.reduce(
      (acc, transaction) => acc + transaction.amount,
      0
    );

    // Send all transactions along with total amount
    res.send({ totalAmount, transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// returns all transactions/expenses
router.get("/transactions", async (req, res) => {
  const token = req.header("Authorization");
  let transactions;

  if (!token) {
    // return all transactions for admin
    transactions = await Transaction.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    transactions = await Transaction.find({ createdBy: decodedToken._id });
  }

  // send all transactions
  res.send(transactions);
});

// create a new transaction/expense
router.post("/create", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateTransaction(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const transaction = new Transaction({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedTransaction = await transaction.save();

    // send the saved transaction as a response
    res.status(200).send(savedTransaction);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
