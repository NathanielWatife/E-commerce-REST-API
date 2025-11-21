const mongoose = require("mongoose");
const { Category } = require("./models/Category.js");
const dotenv = require("dotenv");

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

        await Category.deleteMany({});
        console.log("Existing categories cleared");

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
