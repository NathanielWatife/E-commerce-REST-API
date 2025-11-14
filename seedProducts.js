// Seed script for sample fragrance products
import mongoose from "mongoose";
import { Product } from "./models/Product.js";
import { Category } from "./models/Category.js";
import { User } from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const sampleProducts = [
    {
        name: "Midnight Oud",
        brand: "Luxe Parfums",
        description: "A rich, woody fragrance featuring rare oud wood, amber, and vanilla. Perfect for evening wear with exceptional longevity.",
        price: 89.99,
        countInStock: 50,
        rating: 4.8,
        numReviews: 124,
        isFeatured: true
    },
    {
        name: "Citrus Breeze",
        brand: "Fresh Notes",
        description: "A refreshing blend of bergamot, lemon, and sea salt. Light and invigorating for daily wear.",
        price: 45.99,
        countInStock: 100,
        rating: 4.5,
        numReviews: 89,
        isFeatured: true
    },
    {
        name: "Rose Garden",
        brand: "Fleur de Vie",
        description: "Elegant rose essence combined with peony and white musk. A timeless floral masterpiece.",
        price: 75.00,
        countInStock: 60,
        rating: 4.9,
        numReviews: 156,
        isFeatured: true
    },
    {
        name: "Ocean Mist",
        brand: "Aqua Essence",
        description: "Fresh aquatic notes with hints of jasmine and driftwood. Captures the essence of the ocean breeze.",
        price: 52.99,
        countInStock: 80,
        rating: 4.6,
        numReviews: 67,
        isFeatured: false
    },
    {
        name: "Amber Noir",
        brand: "Luxe Parfums",
        description: "Deep amber and black pepper with tobacco and leather undertones. Bold and sophisticated.",
        price: 95.00,
        countInStock: 35,
        rating: 4.7,
        numReviews: 92,
        isFeatured: true
    },
    {
        name: "Vanilla Dreams",
        brand: "Sweet Scents",
        description: "Warm vanilla bean blended with coconut and sandalwood. Comforting and sweet.",
        price: 38.99,
        countInStock: 120,
        rating: 4.4,
        numReviews: 203,
        isFeatured: false
    },
    {
        name: "Bergamot Bliss",
        brand: "Fresh Notes",
        description: "Sparkling bergamot with neroli and white tea. Clean and uplifting.",
        price: 42.00,
        countInStock: 90,
        rating: 4.5,
        numReviews: 78,
        isFeatured: false
    },
    {
        name: "Mystic Woods",
        brand: "Forest Essence",
        description: "Cedarwood and pine with hints of moss and musk. An enchanting forest walk.",
        price: 68.50,
        countInStock: 55,
        rating: 4.8,
        numReviews: 110,
        isFeatured: true
    },
    {
        name: "Jasmine Night",
        brand: "Fleur de Vie",
        description: "Night-blooming jasmine with tuberose and tonka bean. Sensual and mysterious.",
        price: 82.00,
        countInStock: 45,
        rating: 4.9,
        numReviews: 134,
        isFeatured: false
    },
    {
        name: "Leather & Spice",
        brand: "Urban Edge",
        description: "Rich leather accord with cardamom, black pepper, and vetiver. Modern and edgy.",
        price: 78.99,
        countInStock: 40,
        rating: 4.6,
        numReviews: 88,
        isFeatured: false
    },
    {
        name: "Cherry Blossom",
        brand: "Asian Gardens",
        description: "Delicate cherry blossom with peach and white musk. Soft and romantic.",
        price: 55.00,
        countInStock: 75,
        rating: 4.7,
        numReviews: 145,
        isFeatured: true
    },
    {
        name: "Sandalwood Serenity",
        brand: "Zen Collection",
        description: "Creamy sandalwood with incense and patchouli. Meditative and calming.",
        price: 72.50,
        countInStock: 50,
        rating: 4.8,
        numReviews: 98,
        isFeatured: false
    }
];

const seedProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected for seeding products...");

        // Get all categories
        const categories = await Category.find({});
        if (categories.length === 0) {
            console.log("No categories found. Please run seedCategories.js first!");
            process.exit(1);
        }

        // Get admin user or create one
        let adminUser = await User.findOne({ role: "admin" });
        if (!adminUser) {
            console.log("No admin user found. Creating default admin...");
            adminUser = await User.create({
                name: "Admin",
                email: "admin@raddazle.com",
                password: "admin123",
                role: "admin",
                isVerified: true
            });
        }

        // Clear existing products
        await Product.deleteMany({});
        console.log("Existing products cleared");

        // Assign categories to products and create them
        const productsToCreate = sampleProducts.map((product, index) => ({
            ...product,
            user: adminUser._id,
            category: categories[index % categories.length]._id,
            image: `/img/fragrance-${(index % 12) + 1}.jpg` // We'll use generic images
        }));

        const products = await Product.insertMany(productsToCreate);
        console.log(`${products.length} fragrance products created successfully!`);

        console.log("\nSample Products Created:");
        products.forEach(product => {
            console.log(`- ${product.name} ($${product.price}) - Stock: ${product.countInStock}`);
        });

        process.exit(0);
    } catch (error) {
        console.error("Error seeding products:", error);
        process.exit(1);
    }
};

seedProducts();
