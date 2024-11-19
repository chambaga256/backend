const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");
const { DailyIncome, validateDailyIncome} = require("../modal/dailyincome");
const router = express.Router();
// returns all transactions/expenses
router.get("/salary", async (req, res) => {
  const token = req.header("Authorization");
  let dailyincome;
  if (!token) {
    // return all transactions for admin
    salaries = await DailyIncome.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    salaries = await Salary.find({ createdBy: decodedToken._id });
  }
  // send all transactions
  res.send(dailyincome);
});

// create a new transaction/expense
router.post("/salary", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateDailyIncome(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const income = new DailyIncomeIncome({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const saveddailyicome = await income.save();

    // send the saved transaction as a response
    res.status(200).send(saveddailyicome);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// update an existing transaction/expense
router.put("/salary/:id", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateDailyIncome(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);

  try {
    // Find the salary record by ID and creator to ensure the user can update their own record
    const salary = await DailyIncome.findOne({
      _id: req.params.id,
      createdBy: decodedToken._id,
    });
    console.log("salary...", salary);
    if (!salary) {
      return res.status(404).send("Salary record not found");
    }

    // Update the salary record with the new amount
    salary.amount = req.body.amount;

    // Save the updated record
    const updatedailyincome= await salary.save();

    // Send the updated salary record as a response
    res.status(200).send(updatedailyincome);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;