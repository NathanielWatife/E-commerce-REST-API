const mongoose = require("mongoose");


const UserSchema = new mongoose.Schema(
    {
        username: {typeof: String, required: true, unique: true},
        email : {typeof: String, required: true, unique: true},
        password: {typeof: String, required: true},
        isAdmin: {typeof: Boolean, default:false},
    }, {timestamps: true}
);

module.exports = mongoose.model("User", UserSchema);