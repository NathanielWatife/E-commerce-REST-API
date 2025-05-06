import express from "express";
import { getCategories, getCategoryById, updateCategory, createCategory, deleteCategory } from "../controllers/categoryController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { body } from "express-validator";


const router = express.Router();


// validation of middleware
const validationCategoryCreate = [
	body("name").notEmpty().withMessage("Category name is required"),
	body("description").notEmpty().withMessage("Description is required")
]

// routes for categories
router.route("/").get(getCategories).post(protect, admin, validationCategoryCreate, createCategory);
router.route("/:id").get(getCategoryById).put(protect, admin, updateCategory).delete(protect, admin, deleteCategory)


export default router