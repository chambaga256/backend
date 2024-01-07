const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");
const { Income, validateIncome } = require("../modal/income");

const router = express.Router();

// returns user income summary
router.get("/summary", async (req, res) => {
  try {
    const token = req.header("Authorization");
    let incomes;

    if (!token) {
      // return all income for admin
      incomes = await Income.find();
    } else {
      // return all income for logged in user
      const decodedToken = decodeToken(token);
      incomes = await Income.find({ createdBy: decodedToken._id });
    }

    // Calculate total amount
    const totalIncome = incomes.reduce((acc, income) => acc + income.amount, 0);

    // Send all incomes along with total amount
    res.send({ totalIncome, incomes });
  } catch (error) {
    console.error("Error fetching income summary:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

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

  // before adding new income, get previous total
  const previousIncomes = await Income.find({ createdBy: decodedToken._id });
  // Calculate total amount
  const previousIncomeTotal = previousIncomes.reduce(
    (acc, income) => acc + income.amount,
    0
  );

  // add new income
  const income = new Income({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedIncomes = await income.save();

    // send the saved transaction as a response
    res.status(200).send({ previousIncomeTotal, savedIncomes });
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
