// Seed script for fragrance categories
import mongoose from "mongoose";
import { Category } from "./models/Category.js";
import dotenv from "dotenv";

dotenv.config();

const fragranceCategories = [
    {
        name: "Eau de Parfum",
        description: "Long-lasting fragrances with 15-20% perfume concentration. Perfect for all-day wear.",
        isActive: true
    },
    {
        name: "Eau de Toilette",
        description: "Light and fresh scents with 5-15% perfume concentration. Ideal for everyday use.",
        isActive: true
    },
    {
        name: "Cologne",
        description: "Refreshing and invigorating scents with 2-4% perfume concentration.",
        isActive: true
    },
    {
        name: "Perfume Oils",
        description: "Pure and concentrated fragrance oils for long-lasting scent without alcohol.",
        isActive: true
    },
    {
        name: "Body Mist",
        description: "Light and refreshing body sprays perfect for a quick refresh throughout the day.",
        isActive: true
    },
    {
        name: "Luxury Collection",
        description: "Premium designer fragrances from world-renowned perfume houses.",
        isActive: true
    },
    {
        name: "Unisex Fragrances",
        description: "Gender-neutral scents that anyone can enjoy.",
        isActive: true
    },
    {
        name: "Gift Sets",
        description: "Beautifully packaged fragrance sets perfect for gifting.",
        isActive: true
    }
];

const seedCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected for seeding...");

        // Clear existing categories
        await Category.deleteMany({});
        console.log("Existing categories cleared");

        // Insert new categories
        const categories = await Category.insertMany(fragranceCategories);
        console.log(`${categories.length} fragrance categories created successfully!`);
        
        console.log("\nCreated Categories:");
        categories.forEach(cat => {
            console.log(`- ${cat.name}: ${cat._id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error("Error seeding categories:", error);
        process.exit(1);
    }
};

seedCategories();
