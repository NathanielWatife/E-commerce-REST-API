const mongoose = require("mongoose");

const UserProduct = new mongoose.Schema(
    {
        title: {typeof: String, required: true, unique: true},
        desc : {typeof: String, required: true},
        img: {typeof: String, required: true},
        categories: {typeof: Array},
        size: {typeof:String},
        color: {typeof:String},
        price: {typeof:Number, required: true},
    }, {timestamps: true}
);

module.exports = mongoose.model("User", UserProduct);