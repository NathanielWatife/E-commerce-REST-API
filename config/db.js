import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`Mongo Connected successfully: ${conn.connection.host}`)
    } catch (error) {
        console.error("Error connection to MongoDB: ", error.message)
        process.exit(1)
    }
};