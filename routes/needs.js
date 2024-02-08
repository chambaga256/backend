const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");

const { Needs, validateNeeds } = require("../modal/need");

const router = express.Router();

// returns all transactions/expenses
router.get("/needsamount", async (req, res) => {
  const token = req.header("Authorization");
  let needsamount;

  if (!token) {
    // return all transactions for admin
    needsamount = await Needs.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    needsamount = await Needs.find({ createdBy: decodedToken._id });
  }

  // send all transactions
  res.send(needsamount);
});

// create a new transaction/expense
router.post("/needs", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateNeeds(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const needs = new Needs({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedNeeds = await needs.save();

    // send the saved transaction as a response
    res.status(200).send(savedNeeds);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// update an existing transaction/expense
router.put("/needs/:id", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateNeeds(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);

  try {
    // Find the salary record by ID and creator to ensure the user can update their own record
    const needs = await Needs.findOne({
      _id: req.params.id,
      createdBy: decodedToken._id,
    });
    console.log("needs...", needs);
    if (!needs) {
      return res.status(404).send(" needs record not found");
    }

    // Update the salary record with the new amount
    needs.amount = req.body.amount;

    // Save the updated record
    const updatedNeedsAmount = await needs.save();

    // Send the updated salary record as a response
    res.status(200).send(updatedNeedsAmount);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
