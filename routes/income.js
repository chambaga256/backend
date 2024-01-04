const express = require("express"); 
const { decodeToken } = require("../helpers/decodeToken");
const { Income, validateIncome } = require("../modal/income");

const router = express.Router();

// returns all transactions/expenses
router.get("/income", async (req, res) => {
  const token = req.header("Authorization");
  let incomes;

  if (!token) {
    // return all transactions for admin
    incomes = await Income.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    incomes = await Income.find({ createdBy: decodedToken._id });
  }

  // send all transactions
  res.send(incomes);
});

// create a new transaction/expense
router.post("/income", async (req, res) => {
  const token = req.header("Authorization");
  
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateIncome(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const income= new Income({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedIncomes = await income.save();

    // send the saved transaction as a response
    res.status(200).send(savedIncomes);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
