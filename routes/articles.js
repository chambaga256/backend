const express = require('express');

const Category = require('../modal/articles'); // Import Category model

const router = express.Router()

// Create Category
router.post('/categories', async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create category' });
  }
});

// Get All Categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch categories' });
  }
});

// Update Category
router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update category' });
  }
});

// Delete Category
router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Category.findByIdAndDelete(id);
    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete category' });
  }
});


module.exports = router;