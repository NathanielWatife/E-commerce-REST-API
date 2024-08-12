const mongoose = require("mongoose");

const UserCart = new mongoose.Schema(
    {
        userId: {typeof: String, required: true},
        products : [
            {
                productId: {
                    typeof: String,
                },
                quantity: {
                    typeof: Number,
                    default:1,
                },
            },
        ],
    }, {timestamps: true}
);

module.exports = mongoose.model("User", UserCart);