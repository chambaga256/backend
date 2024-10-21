const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");
const { validateGoal, Goal } = require("../modal/setgoal");

const router = express.Router();

// Get all goals
router.get("/goal", async (req, res) => {
  const token = req.header("Authorization");
  let goals;

  if (!token) {
    // Return all goals for admin
    goals = await Goal.find();
  } else {
    // Return all goals for logged-in user
    const decodedToken = decodeToken(token);
    goals = await Goal.find({ createdBy: decodedToken._id });
  }

  res.send(goals);
});

// Create a new goal
router.post("/goal", async (req, res) => {
  const token = req.header("Authorization");
  
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  const { error } = validateGoal(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);
  const goal = new Goal({
    ...req.body,
    createdBy: decodedToken._id,
  });

  try {
    const savedGoal = await goal.save();
    res.status(200).send(savedGoal);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// Update a goal by ID
router.put("/goal/:id", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  const decodedToken = decodeToken(token);

  // Validate incoming data
  // const { error } = validateGoal(req.body);
  // if (error) return res.status(400).send(error.details[0].message);

  try {
    // Find and update the goal, ensuring it's owned by the logged-in user
    const updatedGoal = await Goal.findOneAndUpdate(
      { _id: req.params.id, createdBy: decodedToken._id },
      { ...req.body },
      { new: true}
    );

    if (!updatedGoal) return res.status(404).send("Goal not found");

    res.send(updatedGoal);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// Delete a goal by ID
router.delete("/goal/:id", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  const decodedToken = decodeToken(token);

  try {
    // Find and delete the goal, ensuring it's owned by the logged-in user
    const deletedGoal = await Goal.findOneAndDelete({
      _id: req.params.id,
      createdBy: decodedToken._id,
    });

    if (!deletedGoal) return res.status(404).send("Goal not found");

    res.send(deletedGoal);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
