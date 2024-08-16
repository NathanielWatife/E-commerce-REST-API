const User = require("../models/User");
const { verifyToken, verifyTokenAndAuthentication } = require("./verifyToken");
const router = require("express").Router();

router.put("/:id", verifyToken, verifyTokenAndAuthentication, async (req, res) => {
    if (req.body.password) {
        req.password = CryptoJS.AES.encrypt(
            req.body.password,
            process.env.PASS_SEC,
        ).toString();
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            $set: req.body
        },{new:true}) 
    } catch (err){
        res.status
    }
});

 
module.exports = router;