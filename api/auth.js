const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");
const Restaurant = require("../models/Restaurant");
const RestaurantNoti = require("../models/RestaurantNoti");
const mailgun = require("mailgun-js");
const DOMAIN = "mg.foodnet.ro";
const api_key = "339804bc04a75f14fe62d0f13c85e08b";
const mg = mailgun({
  apiKey: api_key,
  domain: DOMAIN,
  host: "api.eu.mailgun.net",
});

// @route    POST api/login
// @desc     Authenticate admin & get token
// @access   Public
router.post(
  "/login",
  [
    check("email", "This is not email format").isEmail(),
    check("password", "Password is required").isLength({ min: 6, max: 30 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        status: 400,
        msg: "Invalid credentials",
        result: [],
      });
    }

    const { email, password, code } = req.body;

    try {
      let admin = await Restaurant.findOne({
        where: { email: email, code: code },
      });

      if (!admin) {
        return res.json({
          status: 400,
          msg: "User or password incorrect",
          result: [],
        });
      }

      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.json({
          status: 400,
          msg: "User or password incorrect",
          result: [],
        });
      }

      const payload = {
        admin: {
          id: admin.id,
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: "30 days" },
        (err, token) => {
          if (err) throw err;
          res.json({
            status: 200,
            msg: "Login success",
            result: [{ token: token }],
          });
        }
      );

      await RestaurantNoti.update(
        {
          deviceToken: req.body.token,
        },
        { where: { restaurantId: admin.id } }
      );
    } catch (err) {
      console.log(err);
      return res.json({
        status: 500,
        msg: "Server error",
        result: [],
      });
    }
  }
);

module.exports = router;
