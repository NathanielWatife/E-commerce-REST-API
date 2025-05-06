import express from "express";
import { getProduct, createProduct, getProductById, updateProduct, deleteProduct, createProductReview, getTopProducts } from "../controllers/productController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { body } from "express-validator";

const router = express.Router();


// product validation middleware
const validationProductCreate = [
	body("name").notEmpty().withMessage("Product name is required"),
	body("price").notEmpty().withMessage("Price of product is required and must be numbers"),
	body("description").notEmpty().withMessage("Product description is required"),
	body("image").notEmpty().withMessage("Product image is required"),
	body("brand").notEmpty().withMessage("Product brand is required"),
	body("category").notEmpty().withMessage("Product category is required"),
	body("countInStock").isInt({ min:0 }).withMessage("Count in stock must be non-negative integer")
]


const validationProductReview = [
	body("rating").isInt({min:1, max:5}).withMessage("Rating must be between 1 and 5"),
	body("comment").notEmpty().withMessage("Comment is required")
]



// routes
router.route("/").get(getProduct).post(protect, admin, validationProductCreate, createProduct);
router.route("/top").get(getTopProducts);
router.route("/:id").get(getProductById).put(protect, admin, updateProduct).delete(protect, admin, deleteProduct);
router.route("/:id/reviews").post(protect, admin, validationProductReview, createProductReview)



export default router