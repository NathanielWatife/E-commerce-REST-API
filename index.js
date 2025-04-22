import express from "express";
const app = express();


import connectDB from "./config/db";
import dotenv from "dotenv";
const dotenv = require("dotenv");



dotenv.config();

connectDB();
app.use(express.json());
//  creating routes

app.listen(process.env.PORT || 5003, ()=> {
    console.log("Back-end Server is running");
});