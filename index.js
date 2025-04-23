import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes  from './routes/authRoutes.js';

dotenv.config();
const app = express();
// middleware
app.use(express.json());
//  creating routes
app.use("/api/auth", authRoutes);

app.listen(process.env.PORT, () => {
  connectDB();
  console.log(`Backend Server running on ${process.env.PORT}`);
});
