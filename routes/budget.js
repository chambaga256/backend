const BudgetItem = require("../modal/BudgetItem");
const express = require("express");
const router = express.Router();

router.post("/items", async (req, res) => {
  try {
    const { name, cost } = req.body;

    const newItem = new BudgetItem({
      name,
      cost,
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

router.get("/items", async (req, res) => {
    try {
      const { month } = req.query;
  
      const query = month ? { month } : {};
      const items = await BudgetItem.find(query);
  
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  
  router.put("/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, cost, month } = req.body;
  
      const updatedItem = await BudgetItem.findByIdAndUpdate(
        id,
        { name, cost },
        { new: true, runValidators: true } // Ensures validation is applied
      );
  
      if (!updatedItem) {
        return res.status(404).json({ error: "Item not found." });
      }
  
      res.status(200).json({
        message: "Item updated successfully.",
        item: updatedItem,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  

  module.exports = router;