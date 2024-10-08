const express = require("express");
const app = express();
const mongoose = require("mongoose");
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


app.listen(process.env.PORT || 5003, ()=> {
    console.log("Back-end Server is running");
});