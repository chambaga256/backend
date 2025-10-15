const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");

const { Savings, validateSavings } = require("../modals/savings");

const router = express.Router();

// returns all transactions/expenses
router.get("/savingsamount", async (req, res) => {
  const token = req.header("Authorization");
  let savingsamount;

  if (!token) {
    // return all transactions for admin
    savingsamount = await Savings.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    savingsamount = await Savings.find({ createdBy: decodedToken._id });
  }

  // send all transactions
  res.send(savingsamount);
});

// create a new transaction/expense
router.post("/savings", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateSavings(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const savings = new Savings({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedSavings = await savings.save();

    // send the saved transaction as a response
    res.status(200).send(savedSavings);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// update an existing transaction/expense
router.put("/savings/:id", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateSavings(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);

  try {
    // Find the salary record by ID and creator to ensure the user can update their own record
    const savings = await Savings.findOne({
      _id: req.params.id,
      createdBy: decodedToken._id,
    });
    console.log("savings...", savings);
    if (!savings) {
      return res.status(404).send(" svings record not found");
    }

    // Update the salary record with the new amount
    savings.amount = req.body.amount;

    // Save the updated record
    const updatedSavingsAmount = await savings.save();

    // Send the updated salary record as a response
    res.status(200).send(updatedSavingsAmount);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
