const express = require('express');
const router = express.Router();
const category = require("../modal/category");

router.post('/categories', async (req, res) => {
    try {
      const newCategory = new category(req.body);
      await newCategory.save();
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create category', details: error.message });
    }
  });

  module.exports = router;