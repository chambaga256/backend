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


  router.get('/categories', async (req, res) => {
    try {
      const categories = await category.find();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  module.exports = router;