const express = require("express");
const BudgetItem = require("../modal/BudgetItem");
const { decodeToken } = require("../helpers/decodeToken");
const router = express.Router();

// Middleware to authenticate token and attach user to the request
const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Access token is required" });
    }

    const user = decodeToken(token); // Assuming decodeToken verifies and decodes the token
    if (!user) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = user; // Attach the decoded user data (e.g., user ID) to the request
    next();
  } catch (error) {
    res.status(403).json({ error: "Token verification failed" });
  }
};

// POST: Add a new budget item
router.post("/items", authenticateToken, async (req, res) => {

  const token = req.header("Authorization");
  try {
   const decodedToken = decodeToken(token);
    const { name, cost, month } = req.body;

    const newItem = new BudgetItem({
      name,
      cost,
      month: month || undefined, // Default month is handled in the schema
      createdBy: decodedToken._id, // Use the user ID from the token as the creator
    });

    await newItem.save();

    res.status(201).json({
      message: "Item added successfully.",
      item: newItem,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET: Retrieve items by month for logged-in user
router.get("/items", authenticateToken, async (req, res) => {

  const token = req.header("Authorization");
  try {
    const decodedToken = decodeToken(token);
    const { month } = req.query;

    const query = { createdBy:decodedToken._id }; // Only fetch items created by the logged-in user
    if (month) {
      query.month = month; // Add month filter if provided
    }

    const items = await BudgetItem.find(query);

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update an existing budget item
router.put("/items/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cost, month } = req.body;

    // Ensure the item belongs to the logged-in user
    const item = await BudgetItem.findOne({ _id: id, createdBy: req.user.id });

    if (!item) {
      return res.status(404).json({ error: "Item not found or access denied." });
    }

    item.name = name || item.name;
    item.cost = cost || item.cost;
    item.month = month || item.month;

    const updatedItem = await item.save();

    res.status(200).json({
      message: "Item updated successfully.",
      item: updatedItem,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE: Delete an item
router.delete("/items/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the item belongs to the logged-in user
    const item = await BudgetItem.findOneAndDelete({ _id: id, createdBy: req.user.id });

    if (!item) {
      return res.status(404).json({ error: "Item not found or access denied." });
    }

    res.status(200).json({ message: "Item deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
