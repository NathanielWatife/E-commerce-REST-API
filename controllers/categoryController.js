import { Category } from "../models/Category.js"
import { validationResult } from "express-validator"
import logger from "../utils/logger.js"

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 0, 0), 200); // 0 = no pagination
    const includeCounts = String(req.query.includeCounts || '').toLowerCase() === 'true';

    const filter = {};
    if (search) {
      filter.name = { $regex: new RegExp(search, 'i') };
    }

    const baseQuery = Category.find(filter).sort({ name: 1 });

    let categories;
    let count;
    let pages = 1;
    if (limit > 0) {
      count = await Category.countDocuments(filter);
      pages = Math.max(Math.ceil(count / limit), 1);
      categories = await baseQuery.skip((page - 1) * limit).limit(limit);
    } else {
      categories = await baseQuery;
      count = categories.length;
    }

    if (includeCounts) {
      // Compute product counts per category
      const { Product } = await import('../models/Product.js');
      const agg = await Product.aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      const countMap = new Map(agg.map(a => [String(a._id), a.count]));
      categories = categories.map(c => ({
        ...c.toObject(),
        productCount: countMap.get(String(c._id)) || 0,
      }));
    }

    return res.status(200).json({
      success: true,
      categories,
      page,
      pages,
      count,
    })
  } catch (error) {
    logger.error("Get categories error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    return res.status(200).json({
      success: true,
      category,
    })
  } catch (error) {
    logger.error("Get category by ID error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const { name, description, image } = req.body

    // Check if category already exists
    const categoryExists = await Category.findOne({ name })
    if (categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      })
    }

    const category = new Category({
      name,
      description,
      image,
    })

    const createdCategory = await category.save()

    return res.status(201).json({
      success: true,
      category: createdCategory,
    })
  } catch (error) {
    logger.error("Create category error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const { name, description, image, isActive } = req.body

    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if name is being updated and if it already exists
    if (name && name !== category.name) {
      const categoryExists = await Category.findOne({ name })
      if (categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        })
      }
    }

    category.name = name || category.name
    category.description = description || category.description
    category.image = image || category.image
    category.isActive = isActive !== undefined ? isActive : category.isActive

    const updatedCategory = await category.save()

    return res.status(200).json({
      success: true,
      category: updatedCategory,
    })
  } catch (error) {
    logger.error("Update category error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    await category.deleteOne()

    return res.status(200).json({
      success: true,
      message: "Category removed",
    })
  } catch (error) {
    logger.error("Delete category error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}
