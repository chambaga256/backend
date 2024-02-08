const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");

const { Wants, validateWants } = require("../modal/wants");

const router = express.Router();

// returns all transactions/expenses
router.get("/wantamount", async (req, res) => {
  const token = req.header("Authorization");
  let wantamount;

  if (!token) {
    // return all transactions for admin
    wantamount = await Wants.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    wantamount = await Wants.find({ createdBy: decodedToken._id });
  }

  // send all transactions
  res.send(wantamount);
});

// create a new transaction/expense
router.post("/want", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateWants(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const wants = new Wants({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedWants = await wants.save();

    // send the saved transaction as a response
    res.status(200).send(savedWants);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// update an existing transaction/expense
router.put("/wants/:id", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateWants(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);

  try {
    // Find the salary record by ID and creator to ensure the user can update their own record
    const wants = await Wants.findOne({
      _id: req.params.id,
      createdBy: decodedToken._id,
    });
    console.log("wants...", wants);
    if (!wants) {
      return res.status(404).send("want amount record not found");
    }

    // Update the salary record with the new amount
    wants.amount = req.body.amount;

    // Save the updated record
    const updatedWantAmount = await wants.save();

    // Send the updated salary record as a response
    res.status(200).send(updatedWantAmount);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
