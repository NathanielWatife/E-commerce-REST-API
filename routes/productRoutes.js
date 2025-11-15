import express from "express";
import { getProducts, createProduct, getProductById, updateProduct, deleteProduct, createProductReview, getTopProduct, searchProducts, adjustInventory, getInventoryHistory } from "../controllers/productController.js";
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

const validateAdjustInventory = [
	body("delta").notEmpty().isInt().withMessage("delta must be an integer"),
	body("reason").optional().isIn(["order-placement","order-cancellation","manual-adjustment","return","correction","initial-stock"]).withMessage("Invalid reason"),
	body("note").optional().isString().isLength({ max: 500 })
]


// routes
router.route("/").get(getProducts).post(protect, admin, validationProductCreate, createProduct);
router.route("/top").get(getTopProduct);
router.route("/search").get(searchProducts);
router.route("/:id").get(getProductById).put(protect, admin, updateProduct).delete(protect, admin, deleteProduct);
router.route("/:id/reviews").post(protect, validationProductReview, createProductReview);
router.route("/:id/inventory/adjust").post(protect, admin, validateAdjustInventory, adjustInventory);
router.route("/:id/inventory/history").get(protect, admin, getInventoryHistory);
// implement search routes later



export default router;