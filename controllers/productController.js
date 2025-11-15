import { Product } from "../models/Product.js";
import { InventoryHistory } from "../models/InventoryHistory.js";
import { Category } from "../models/Category.js";
import { validationResult } from "express-validator";
import logger from "../utils/logger.js";


// get products
export const getProducts = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 10
        const page = Number(req.query.page) || 1
        const keyword = req.query.keyword ? {
            name: {
                $regex: req.query.keyword,
                $options: "i",
            },
        }: {}

        const category = req.query.category ? {
            category: req.query.category
        } : {}
        const count = await Product.countDocuments({
            ...keyword,
            ...category
        })
        const products = await Product.find({
            ...keyword,
            ...category
        })
            .populate("category", "name")
            .populate("user", "name")
            .limit(pageSize)
            .skip(pageSize * (page -1))
            .sort({ createdAt: -1 })
        
            return res.status(200).json({
                success: true,
                products,
                page,
                pages: Math.ceil(count / pageSize),
                count
            })
    } catch (error) {
        logger.error("Error getting Products:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        })
    }
};




// getting a single product using it Id number
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate("category", "name")
            .populate("user", "name")
            .populate({
                path: "reviews.user",
                select: "name avatar"
            })

        if (!product){
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }
        return res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        logger.error("Get product by it's Id error:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};


// create a product
export const createProduct = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        })
    }

    try {
        const { name, price, description, image, brand, category, countInStock, isFeatured } = req.body;
        // check if the category exists
        const categoryExists = await Category.findById(category)
        if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category"
                })
            }
        const product = new Product({
            name,
            price,
            user: req.user._id,
            image,
            brand,
            category,
            countInStock,
            description,
            isFeatured
        })

        const createdProduct = await product.save()

        return res.status(201).json({
            success: true,
            product: createdProduct
        });
    } catch (error) {
        logger.error("Create product error:", error)
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        }) 
    }
};


// update a an existing product
export const updateProduct = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        })
    }
    try {
        const { name, price, description, image, brand, category, countInStock, isFeatured } = req.body;

        const product = await Product.findById(req.params.id)

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }

        // we check if the category exists if it's being updated
        if (category && category !== product.category.toString()) {
            const categoryExists = await Category.findById(category)
            if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category"
                });
            }
        }

        product.name = name || product.name
        product.price = price || product.price
        product.description = description || product.description
        product.image = image || product.image
        product.brand = brand || product.brand
        product.category = category || product.category
        const originalStock = product.countInStock
        product.countInStock = countInStock !== undefined ? countInStock : product.countInStock
        product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured

    const updatedProduct = await product.save()

        if (countInStock !== undefined && countInStock !== originalStock) {
            await InventoryHistory.create({
                product: updatedProduct._id,
                user: req.user._id,
                change: countInStock - originalStock,
                reason: "manual-adjustment",
                previousStock: originalStock,
                newStock: updatedProduct.countInStock,
                note: `Manual update via product edit`
            })
        }

        return res.status(200).json({
            success: true,
            product: updatedProduct
        })
    } catch (error) {
        logger.error("Update product error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};




// delete product only admins access
export const deleteProduct = async (req, res) => {
    try {
        const product =  await Product.findById(req.params.id)

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        await product.deleteOne()

        return res.status(200).json({
            success: true,
            message: "Product removed"
        });
    } catch (error) {
        logger.error("Delete products error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};


// create nere product review by admin
export const createProductReview = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // check if the user already review these product
        const alreadyReviewed = product.reviews.find((r) => r.user.toString() === req.user._id.toString());

        if (alreadyReviewed) {
            return res.status(400).json({
                success: false,
                message: "Product already reviewed"
            });
        }

        const review = {
            name: req.user.name,
            rating: Number(rating),
            comment,
            user: req.user._id
        }

        product.reviews.push(review)

        product.numReviews = product.reviews.length
        product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length

        await product.save();

        return res.status(201).json({
            success: true,
            message: "Review added to product"
        });
    } catch (error) {
        logger.error("Create product review error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};


// get the top rated products
export const getTopProduct = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ rating: -1 }).limit(5);

        return res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        logger.error("Get top product error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// search products (frontend may call /products/search?q=...)
export const searchProducts = async (req, res) => {
    // normalize query param to keyword used by getProducts
    if (req.query.q && !req.query.keyword) {
        req.query.keyword = req.query.q;
    }
    // delegate to existing getProducts handler
    return getProducts(req, res);
};

// Adjust inventory for a product (admin)
export const adjustInventory = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() })
    }
    try {
        const { delta, reason, note } = req.body
        const product = await Product.findById(req.params.id)
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" })
        }
        const prev = product.countInStock
        product.countInStock = Math.max(0, prev + Number(delta))
        const saved = await product.save()
        await InventoryHistory.create({
            product: saved._id,
            user: req.user._id,
            change: Number(delta),
            reason: reason || "manual-adjustment",
            previousStock: prev,
            newStock: saved.countInStock,
            note,
        })
        return res.status(200).json({ success: true, product: saved })
    } catch (error) {
        logger.error("Adjust inventory error:", error)
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined })
    }
}

// Get inventory history for a product
export const getInventoryHistory = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 20
        const page = Number(req.query.page) || 1
        const [items, count] = await Promise.all([
            InventoryHistory.find({ product: req.params.id })
                .populate("user", "name email")
                .populate("order", "_id status createdAt")
                .sort({ createdAt: -1 })
                .limit(pageSize)
                .skip(pageSize * (page - 1)),
            InventoryHistory.countDocuments({ product: req.params.id }),
        ])
        return res.status(200).json({ success: true, history: items, page, pages: Math.ceil(count / pageSize), count })
    } catch (error) {
        logger.error("Get inventory history error:", error)
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined })
    }
}