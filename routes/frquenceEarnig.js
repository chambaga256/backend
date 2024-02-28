const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");
const { Salary, validateSalary } = require("../modal/frquenceEarnig");
const {
  validateFrequencyArray,
  Frequency,
} = require("../modal/frquenceEarnig");

const router = express.Router();

// returns all transactions/expenses
router.get("/frequncy", async (req, res) => {
  const token = req.header("Authorization");
  let frequencies;

  if (!token) {
    // return all transactions for admin
    frequencies = await Frequency.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    frequencies = await Frequency.find({ createdBy: decodedToken._id });
  }

  // send all transactions
  res.send(frequencies);
});

// create a new transaction/expense
router.post("/frequncy", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateFrequencyArray(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const frequency = new Frequency({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedFrequency = await frequency.save();

    // send the saved transaction as a response
    res.status(200).send(savedFrequency);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// update an existing transaction/expense
router.put("/frequncy/:id", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateFrequencyArray(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);

  try {
    // Find the frequency record by ID and creator to ensure the user can update their own record
    const frequency = await Frequency.findOne({
      _id: req.params.id,
      createdBy: decodedToken._id,
    });
    console.log("frequency...", frequency);
    if (!frequency) {
      return res.status(404).send("Salary record not found");
    }

    // Update the frequency record with the new amount
    frequency.frequency = req.body.frequency;

    // Save the updated record
    const updatedFrequency = await frequency.save();

    // Send the updated frequency record as a response
    res.status(200).send(updatedFrequency);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
