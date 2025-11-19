const express = require("express");
const { getCategories, getCategoryById, updateCategory, createCategory, deleteCategory } = require("../controllers/categoryController.js");
const { protect, admin } = require("../middleware/authMiddleware.js");
const { body } = require("express-validator");


const router = express.Router();


// validation of middleware
const validationCategoryCreate = [
	body("name").notEmpty().withMessage("Category name is required"),
	body("description").notEmpty().withMessage("Description is required")
]

// routes for categories
router.route("/").get(getCategories).post(protect, admin, validationCategoryCreate, createCategory);
router.route("/:id").get(getCategoryById).put(protect, admin, updateCategory).delete(protect, admin, deleteCategory)


module.exports = router