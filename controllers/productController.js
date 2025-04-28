import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { validationResult } from "express-validator";


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
        console.error("Error getting Products: ", error)
        return res.status(500).json({
            success: false,
            message: "Server errorr",
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
                succes: false,
                message: "Product not found"
            })
        }
        return res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        console.error("Get product by it's Id error: ", error)
        return res.status(500).json({
            success: false,
            message: "Server error"
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
                succes: false,
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
        console.error("Create product error: ")
    }
};