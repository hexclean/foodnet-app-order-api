const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header("x-auth-token");

  // Verify token
  try {
    await jwt.verify(token, config.get("jwtSecret"), (error, decoded) => {
      if (token != undefined) {
        req.admin = decoded.admin;
        next();
      } else {
        next();
      }
    });
  } catch (err) {
    console.log(err);
    console.error("Something wrong...");
    res.status(500).json({ msg: "Server error" });
  }
};
