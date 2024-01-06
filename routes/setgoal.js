const express = require("express"); 
const { decodeToken } = require("../helpers/decodeToken");
const { validateGoal, Goal } = require("../modal/setgoal");

const router = express.Router();

// returns all transactions/expenses
router.get("/goal", async (req, res) => {
  const token = req.header("Authorization");
  let goals;

  if (!token) {
    // return all transactions for admin
    goals = await Goal.find();
  } else {
    // return all transactions for logged in user
    const decodedToken = decodeToken(token);
    goals = await Goal.find({ createdBy: decodedToken._id });
  }

  // send all transactions
  res.send(goals);
});

// create a new transaction/expense
router.post("/goal", async (req, res) => {
  const token = req.header("Authorization");
  
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // validate incoming data
  const { error } = validateGoal(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create a new transaction instance
  const decodedToken = decodeToken(token);
  const goal= new Goal({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    // save the transaction to the database
    const savedGoal = await goal.save();

    // send the saved transaction as a response
    res.status(200).send(savedGoal);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
