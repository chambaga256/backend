
const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");
const { MySavings, validateSavings } = require("../modal/mysavings");

const router = express.Router();

// 📘 GET all savings (admin sees all, user sees only theirs)
router.get("/mysavings", async (req, res) => {
  const token = req.header("Authorization");
  let savingsList = [];

  try {
    if (!token) {
      // Admin: return all savings
      savingsList = await MySavings.find();
    } else {
      // Logged-in user: return only their savings
      const decodedToken = decodeToken(token);
      savingsList = await MySavings.find({ createdBy: decodedToken._id });
    }

    res.status(200).send(savingsList);
  } catch (err) {
    console.error("Error fetching savings:", err);
    res.status(500).send("Internal Server Error");
  }
});

// 📘 POST create new saving
router.post("/mysavings", async (req, res) => {
  const token = req.header("Authorization");

  if (!token) return res.status(401).send("Unauthorized");

  const { error } = validateSavings(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);

  try {
    const savings = new MySavings({
      ...req.body,
      createdBy: decodedToken._id,
    });

    const savedSavings = await savings.save();
    res.status(201).send(savedSavings);
  } catch (err) {
    console.error("Error saving record:", err);
    res.status(500).send("Internal Server Error");
  }
});

// 📘 PUT update saving record
router.put("/mysavings/:id", async (req, res) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Unauthorized");

  const { error } = validateSavings(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const decodedToken = decodeToken(token);

  try {
    // find the record by id and creator
    const savings = await MySavings.findOne({
      _id: req.params.id,
      createdBy: decodedToken._id,
    });

    if (!savings) return res.status(404).send("Savings record not found");

    savings.savingName = req.body.savingName;
    savings.amount = req.body.amount;

    const updatedSavings = await savings.save();
    res.status(200).send(updatedSavings);
  } catch (err) {
    console.error("Error updating record:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
