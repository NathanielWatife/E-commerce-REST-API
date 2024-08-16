// import { Router } from "express";
const { verifyToken } = require("./verifyToken");
const router = require("express").Router();

router.put("/:id", verifyToken, (req, res) => {
    
});
// router.put("/:id")

 
module.exports = Router;