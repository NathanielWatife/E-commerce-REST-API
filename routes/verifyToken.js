const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next)=>{
    const authHeader = req.headers.token;
    if (authHeader){
        jwt.verify(token, process.env.JWT_SEC, (err, user) => {
            if (err)res.status(403).json("Token is not Valid");
                req.user = user;
                next();
        })
    } else {
        return res.status(401).json("You are not authemticated");
    }
};

const verifyTokenAndAuthentication = (req, res) => {
    verifyToken(req, res, () => {
        if (req.user.id === req.params.id || req.user.isAdmin) {
            next();

        } else {
            res.status(403).json("Not allowed");
        }
    });
}


module.exports = {verifyToken, verifyTokenAndAuthentication};