const router = require("express").Router();

router.get("/usertest", (req, res) => {
    res.send("User test 200!!");
});

router.post("/userpost", (req, res) => {
    const username = req.body.username;
    console.log(username);
    res.send(username);
});


module.exports = router;