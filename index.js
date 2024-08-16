import express from "express";
const app = express();
import mongoose from "mongoose";
// import { configDotenv } from "dotenv";
const dotenv = require("dotenv");
const userRoute = require("./routes/user");
const authRoute = require("./routes/auth");

dotenv.config();
mongoose.connect(process.env.MONGO_URL).then(() => console.log("DB-Connection good!!")).catch((err) => {
    console.log(err);
});

app.use(express.json());
//  creating routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);





app.listen(process.env.PORT || 5000, ()=> {
    console.log("Server running.........")
});