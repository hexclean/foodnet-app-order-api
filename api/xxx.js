const express = require("express");
const router = express.Router();
var request = require("request");
const orderUser = require("../middleware/orderUser");
const OrderItemExtra = require("../models/OrderItemExtra");
const Order = require("../models/Order");
const Extra = require("../models/Extra");
const User = require("../models/User");
const UserDeliveryAddress = require("../models/UserDeliveryAddress");
const OrderItem = require("../models/OrderItem");
const ProductVariantExtras = require("../models/ProductVariantsExtras");
const ProductFinal = require("../models/ProductFinal");
const RestaurantReview = require("../models/RestaurantsReviews");
const LocationName = require("../models/LocationName");
const OrderDeliveryAddress = require("../models/OrderDeliveryAddress");
var ejs = require("ejs");
const auth = require("../middleware/auth");
const Variant = require("../models/Variant");
const Product = require("../models/Product");
const ProductTranslation = require("../models/ProductTranslation");
const ExtraTranslation = require("../models/ExtraTranslation");
const LocationNameTranslation = require("../models/LocationNameTranslation");
const ProductHasAllergen = require("../models/ProductHasAllergen");
const Allergen = require("../models/Allergen");
const AllergenTranslation = require("../models/AllergenTranslation");
const Cryptr = require("cryptr");
const Sequelize = require("sequelize");
const Restaurant = require("../models/Restaurant");
const Box = require("../models/Box");
const mailgun = require("mailgun-js");
const DOMAIN = "mg.foodnet.ro";
const api_key = "339804bc04a75f14fe62d0f13c85e08b";
const mg = mailgun({
  apiKey: api_key,
  domain: DOMAIN,
  host: "api.eu.mailgun.net",
});

// var ema = require("../test.ejs");
// @route    POST api/orders
// @desc     Create an order
// @access   Private
router.post("/", orderUser, async (req, res, next) => {
  //
  let languageCode;

  if (req.body.lang == "ro") {
    languageCode = 1;
  } else if (req.body.lang == "hu") {
    languageCode = 2;
  } else {
    languageCode = 3;
  }
  const restaurantId = req.body.restaurantId;
  const products = req.body.products;
  const cutlery = req.body.cutlery;
  const take = req.body.take;
  const token = req.header("x-auth-token");
  let userDeliveryId = [];
  let orderStreet;
  let orderedLocation;
  let orderHouseNumber;
  let orderFloor;
  let orderDoorNumber;
  let orderPhoneNumber;
  let deliveryAddressIdCreated;
  let location = 0;
  let userName;
  let userEmail;
  let restaurantEmail;
  let restaurantPhone;
  if (req.body.deliveryAddressId == undefined && token != undefined) {
    const user = await User.findByPk(req.user.id);
    deliveryAddressIdCreated = await UserDeliveryAddress.create({
      street: req.body.street,
      houseNumber: req.body.houseNumber,
      floor: req.body.floor,
      doorNumber: req.body.doorNumber,
      userId: req.user.id,
      locationNameId: req.body.locationId,
    });
    const locationName = await LocationName.findByPk(req.body.locationId, {
      include: [
        { model: LocationNameTranslation, where: { languageId: languageCode } },
      ],
    });
    orderedLocation = locationName.LocationNameTranslations[0].name;
    userName = user.fullName;
    userEmail = user.email;
    orderPhoneNumber = user.phoneNumber;
    location = req.body.locationId;
    deliveryAddressIdCreated = deliveryAddressIdCreated.id;
  }

  if (token != undefined && req.body.deliveryAddressId != undefined) {
    const checkUserValidation = await User.findByPk(req.user.id, {
      include: [
        {
          model: UserDeliveryAddress,
          where: { id: req.body.deliveryAddressId },
        },
      ],
    });

    const locationOrder = await UserDeliveryAddress.findOne({
      where: { userId: req.user.id, id: req.body.deliveryAddressId },
      include: [
        {
          model: LocationName,
          include: [
            {
              model: LocationNameTranslation,
              where: { languageId: languageCode },
            },
          ],
        },
      ],
    });
    location = locationOrder.locationNameId;
    orderStreet = locationOrder.street;
    orderedLocation =
      locationOrder.LocationName.LocationNameTranslations[0].name;

    orderHouseNumber = locationOrder.houseNumber;
    orderFloor = locationOrder.floor;
    orderDoorNumber = locationOrder.doorNumber;
    orderPhoneNumber = checkUserValidation.phoneNumber;
    userName = checkUserValidation.fullName;

    for (let i = 0; i < checkUserValidation.UserDeliveryAddresses.length; i++) {
      userDeliveryId.push(checkUserValidation.UserDeliveryAddresses[i].id);
    }
    if (!userDeliveryId.includes(req.body.deliveryAddressId)) {
      return res.json({
        status: 400,
        msg: "Please don't cheat",
        result: [],
      });
    }
  }

  if (token != undefined && req.body.deliveryAddressId != undefined) {
    checkUser = await User.findOne({
      where: { id: req.user.id },
      include: [
        {
          model: UserDeliveryAddress,
          where: { id: req.body.deliveryAddressId },
        },
      ],
    });
    userEmail = checkUser.email;
  } else {
    checkUser = 1;
  }

  if (token == undefined) {
    const locationName = await LocationName.findByPk(req.body.locationId, {
      include: [
        { model: LocationNameTranslation, where: { languageId: languageCode } },
      ],
    });
    const rest = await Restaurant.findByPk(restaurantId);
    restaurantEmail = rest.email;
    restaurantPhone = rest.phoneNumber;
    orderedLocation = locationName.LocationNameTranslations[0].name;
    userEmail = req.body.email;
    location = req.body.locationId;
  }

  let frontendProductId = [];
  let frontendRequiredExtraId = [];
  let frontendOptionalExtraId = [];
  let frontendProductsPrice = [];
  let restaurantSelectedLang;
  let locationType;
  let restaurantName;

  try {
    const locationTypeDb = await LocationName.findByPk(location);
    const restaurantDeliveryPrice = await Restaurant.findByPk(
      req.body.restaurantId
    );
    restaurantEmail = restaurantDeliveryPrice.email;

    restaurantName = restaurantDeliveryPrice.fullName;
    const restaurantCity = restaurantDeliveryPrice.deliveryPriceCity;
    const restaurantVillage = restaurantDeliveryPrice.deliveryPriceVillage;
    restaurantSelectedLang = restaurantDeliveryPrice.orderedLang;
    restaurantPhone = restaurantDeliveryPrice.phoneNumber;
    restaurantEmail = restaurantDeliveryPrice.email;
    locationType = locationTypeDb.type;
    let totalPrice = 0;
    let deliveredPrice = 0;

    if (locationType == 1) {
      deliveredPrice = restaurantVillage;
    } else {
      deliveredPrice = restaurantCity;
    }

    products.map(async (products) => {
      const items = {
        product_id: products.productId,
        variant_id: products.variantId,
        product_quantity: products.quantity,
        product_price: products.productPrice,
        box_price: products.boxPrice,
      };
      frontendProductsPrice.push(items);
      frontendProductId.push(items);

      const extras = products.extras;
      extras.map(async (extra) => {
        if (extra.type == "req") {
          const requiredExtId = {
            extra_id: extra.id,
            variant_id: products.variantId,
            quantity: products.quantity,
            price: extra.extraPrice * products.quantity,
            counter: products.counter,
          };
          frontendRequiredExtraId.push(requiredExtId);
        } else {
          const optionalExtId = {
            extra_id: extra.id,
            variant_id: products.variantId,
            quantity: products.quantity,
            price: extra.extraPrice * products.quantity,
            counter: products.counter,
          };
          frontendOptionalExtraId.push(optionalExtId);
        }
      });
    });

    const reducedOpt = frontendOptionalExtraId.reduce((acc, val) => {
      const { extra_id, quantity, price, variant_id, ...otherFields } = val;

      const existing = acc.find((item) => item.counter === val.counter);
      if (!existing) {
        acc.push({
          ...otherFields,
          extras: [
            {
              extra_id,
              quantity,
              price,
              variant_id,
            },
          ],
        });
        return acc;
      }

      existing.extras.push({
        extra_id,
        quantity,
        price,
        variant_id,
      });
      return acc;
    }, []);
    const reducedReq = frontendRequiredExtraId.reduce((acc, val) => {
      const { extra_id, quantity, variant_id, price, ...otherFields } = val;

      const existing = acc.find((item) => item.counter === val.counter);
      if (!existing) {
        acc.push({
          ...otherFields,
          extras: [
            {
              extra_id,
              quantity,
              price,
              variant_id,
            },
          ],
        });
        return acc;
      }

      existing.extras.push({
        extra_id,
        quantity,
        price,
        variant_id,
      });
      return acc;
    }, []);

    let getOptionalExtraPrice = [];
    let notValidatedOptionalExtra = [];
    if (reducedOpt.length != 0) {
      for (let s = 0; s < reducedOpt.length; s++) {
        for (let i = 0; i < reducedOpt[s].extras.length; i++) {
          const optionalExtrasFromDb = await ProductVariantExtras.findAll({
            where: {
              active: 1,
              extraId: reducedOpt[s].extras[i].extra_id,
              variantId: reducedOpt[s].extras[i].variant_id,
            },
          });

          notValidatedOptionalExtra.push(
            parseFloat(reducedOpt[s].extras[i].price) *
              parseInt(reducedOpt[s].extras[i].quantity)
          );
          for (let k = 0; k < optionalExtrasFromDb.length; k++) {
            getOptionalExtraPrice.push(
              parseFloat(optionalExtrasFromDb[k].price) *
                parseInt(reducedOpt[s].extras[i].quantity)
            );
          }
        }
      }
    } else {
      notValidatedOptionalExtra.push(0);
      getOptionalExtraPrice.push(0);
    }

    let getRequiredExtraPrice = [];
    let notValidatedRequiredExtra = [];
    if (reducedReq.length != 0) {
      for (let s = 0; s < reducedReq.length; s++) {
        for (let i = 0; i < reducedReq[s].extras.length; i++) {
          const optionalExtrasFromDb = await ProductVariantExtras.findAll({
            where: {
              requiredExtra: 1,
              extraId: reducedReq[s].extras[i].extra_id,
              variantId: reducedReq[s].extras[i].variant_id,
            },
          });
          notValidatedRequiredExtra.push(
            parseFloat(reducedReq[s].price) *
              parseInt(reducedReq[s].extras[i].quantity)
          );
          for (let k = 0; k < optionalExtrasFromDb.length; k++) {
            getRequiredExtraPrice.push(
              parseFloat(optionalExtrasFromDb[k].price) *
                parseInt(reducedReq[s].extras[i].quantity)
            );
          }
        }
      }
    } else {
      getRequiredExtraPrice.push(0);
      notValidatedRequiredExtra.push(0);
    }

    let currentProductName = [];

    let getProductPrice = [];
    let notValidatedProductPrice = [];
    for (let s = 0; s < frontendProductId.length; s++) {
      const productFromDb = await ProductFinal.findAll({
        where: {
          active: 1,
          productId: frontendProductId[s].product_id,
        },
      });

      notValidatedProductPrice.push(
        parseFloat(frontendProductId[s].product_price) *
          parseInt(frontendProductId[s].product_quantity)
      );
      for (let k = 0; k < productFromDb.length; k++) {
        getProductPrice.push(
          parseFloat(productFromDb[k].price) *
            parseInt(frontendProductId[s].product_quantity)
        );
      }
    }

    let getBoxPrice = [];
    for (let s = 0; s < frontendProductId.length; s++) {
      const productFromDb = await ProductFinal.findAll({
        where: {
          active: 1,
          productId: frontendProductId[s].product_id,
        },
        include: [{ model: Box }],
      });
      for (let k = 0; k < productFromDb.length; k++) {
        if (productFromDb[k].Box !== null) {
          getBoxPrice.push(
            parseFloat(productFromDb[k].Box.price) *
              parseInt(frontendProductId[s].product_quantity)
          );
        }
      }
    }

    let optExtValidated = getOptionalExtraPrice.reduce((a, b) => a + b, 0);
    let reqExtValidated = getRequiredExtraPrice.reduce((a, b) => a + b, 0);
    let productPriceValidated = getProductPrice.reduce((a, b) => a + b, 0);
    let boxPriceValidated = getBoxPrice.reduce((a, b) => a + b, 0);
    let productPriceNotValidated = notValidatedProductPrice.reduce(
      (a, b) => a + b,
      0
    );

    let reqExtraPriceNotValidated = notValidatedRequiredExtra.reduce(
      (a, b) => a + b,
      0
    );
    let optExtraPriceNotValidated = notValidatedOptionalExtra.reduce(
      (a, b) => a + b,
      0
    );

    totalPrice =
      optExtValidated +
      reqExtValidated +
      productPriceValidated +
      deliveredPrice +
      boxPriceValidated;

    if (
      totalPrice != req.body.finalPrice ||
      productPriceValidated != productPriceNotValidated ||
      (cutlery != 0 && cutlery != 1) ||
      (take != 0 && take != 1)
    ) {
      return res.json({
        status: 400,
        msg: "Please don't cheat",
        result: [],
      });
    }

    let finalOrderId;
    let finSum = req.body.finalPrice;
    let noDelivery = req.body.finalPrice - deliveredPrice;
    if (req.body.deliveryAddressId != undefined && token != undefined) {
      const orderDelAdd = await OrderDeliveryAddress.create({
        street: orderStreet,
        houseNumber: orderHouseNumber,
        floor: orderFloor,
        doorNumber: orderDoorNumber,
        phoneNumber: orderPhoneNumber,
        userId: req.user.id,
        userName: userName,
        email: userEmail,
      });

      var digit = ("" + orderDelAdd.id)[1];
      var digitfirst = ("" + orderDelAdd.id)[0];

      const cryptr = new Cryptr("orderIdSecretKey");
      let test = [0, 1, 2, 3, 4, 5, 7, 8, 9][Math.floor(Math.random() * 9)];

      const encryptedString = cryptr.encrypt(orderDelAdd.id);
      orderIdSecretKey =
        digitfirst + encryptedString.substring(0, 6).slice(0, 6) + digit + test;

      const order = await Order.create({
        totalPrice: req.body.finalPrice,
        lang: req.body.lang,
        deliveryPrice: req.body.deliveryPrice,
        cutlery: cutlery,
        orderType: 0,
        take: take,
        userId: req.user.id,
        restaurantId: restaurantId,
        locationNameId: location,
        orderDeliveryAddressId: orderDelAdd.id,
        orderStatusId: 1,
        messageCourier: req.body.messageCourier,
        encodedKey: orderIdSecretKey.toUpperCase(),
        mobile: 0,
        web: 1,
      });

      finalOrderId = order.encodedKey;

      let orderId = order.id;
      let orderedProducts = [];
      await Promise.all(
        products.map(async (prod) => {
          const extras = prod.extras;
          orderedProducts.push(prod);
          const orderItem = await OrderItem.create({
            message: prod.message,
            boxPrice: prod.boxPrice,
            variantId: prod.variantId,
            quantity: prod.quantity,
            orderId: orderId,
            variantPrice: prod.productPrice,
          });
          extras.map(async (extras) => {
            await OrderItemExtra.create({
              quantity: prod.quantity,
              orderItemId: orderItem.id,
              extraId: extras.id,
              extraPrice: extras.extraPrice,
            });
          });
        })
      );
      if (req.body.lang == "hu") {
        async function sendSms() {
          var jsonDataObj = {
            to: restaurantPhone,
            sender: "4",
            body: `Kedves Partnerünk! Új rendelés érkezett a Foodnet-en.\nAzonosító: ${finalOrderId}`,
          };
          request.post({
            headers: {
              "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
            },
            url: "https://app.smso.ro/api/v1/send",
            body: jsonDataObj,
            json: true,
          });
        }
        async function sendEmailUser() {
          let ordId = orderIdSecretKey.toUpperCase();
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Rendelésed sikeresen elküldted a(z) ${restaurantName} étteremnek. Hamarosan értesítést kapsz az étteremtől.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves ${userName}!</h1>
                                    <p>
                                    Rendelésed sikeresen elküldted a(z) <u>${restaurantName}</u> étteremnek. Hamarosan értesítést kapsz az étteremtől.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                    <p>
                                    Ha szeretnél változtattni a rendeléseden, akkor a következő telefonszámon ezt megteheted: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>. Hívatkozz az következő rendelési számra: ${ordId}.
                                  </p>
                                  <p>Jó étvágyat kíván a Foodnet csapata!</p>
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );
          console.log(userEmail);
          console.log("fasz");

          const data = {
            from: "info@foodnet.ro",
            to: userEmail,
            subject: "Sikeres rendelés",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            console.log(body);
            if (error) {
              console.log(error);
            }
          });
        }
        async function sendEmailRestaurant() {
          let ordId = orderIdSecretKey.toUpperCase();
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Új rendelés érkezett a Foodnetről.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves partnerünk!</h1>
                                    <p>
                                    Új rendelés érkezett.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                   
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: restaurantEmail,
            subject: "Új rendelés a Foodnetről!",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }
        await sendEmailUser();
        await sendEmailRestaurant();
        await sendSms();
      } else {
        async function sendSms() {
          var jsonDataObj = {
            to: restaurantPhone,
            sender: "4",
            body: `Kedves Partnerünk! Új rendelés érkezett a Foodnet-en.\nAzonosító: ${finalOrderId}`,
          };
          request.post({
            headers: {
              "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
            },
            url: "https://app.smso.ro/api/v1/send",
            body: jsonDataObj,
            json: true,
          });
        }
        async function sendEmailUser() {
          let ordId = orderIdSecretKey.toUpperCase();
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };
          // restaurantSelectedLang

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Rendelésed sikeresen elküldted a(z) ${restaurantName} étteremnek. Hamarosan értesítést kapsz az étteremtől.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Stimate ${userName}!</h1>
                                    <p>
                                    Comanda dumneavoastră a fost recepționată de succes de către restaurantul <u>${restaurantName}</u>. În curând vețti fi contactat de la restaurant
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Nume:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Număr telefon:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Localitatea</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Strada:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Număr:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Etaj:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Apartament:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Numar comandă: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Ambalajul</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Cost livrare</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Suma finală
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                    <p>
                                    Dacă vrei să modifici comanda sună la numărul: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>. Menționază numărul de comandă: ${ordId}.
                                  </p>
                                  <p>Poftă bună! - echipa Foodnet</p>
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Toate drepturile rezervate
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Joseni, nr. 820, Principală<br />Cod poștal: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: userEmail,
            subject: "Sikeres rendelés",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }
        async function sendEmailRestaurant() {
          let ordId = orderIdSecretKey.toUpperCase();
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Új rendelés érkezett a Foodnetről.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves partnerünk!</h1>
                                    <p>
                                    Új rendelés érkezett.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                   
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: restaurantEmail,
            subject: "Új rendelés a Foodnetről!",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }
        await sendEmailUser();
        await sendEmailRestaurant();
        await sendSms();
      }
    }
    if (req.body.deliveryAddressId == undefined && token != undefined) {
      const orderDelAdd = await OrderDeliveryAddress.create({
        street: req.body.street,
        houseNumber: req.body.houseNumber,
        floor: req.body.floor,
        doorNumber: req.body.doorNumber,
        phoneNumber: orderPhoneNumber,
        userId: req.user.id,
        userName: userName,
        locationNameId: req.body.locationId,
        email: userEmail,
      });

      var digit = ("" + orderDelAdd.id)[1];
      var digitfirst = ("" + orderDelAdd.id)[0];

      const cryptr = new Cryptr("orderIdSecretKey");
      let test = [0, 1, 2, 3, 4, 5, 7, 8, 9][Math.floor(Math.random() * 9)];

      const encryptedString = cryptr.encrypt(orderDelAdd.id);
      orderIdSecretKey =
        digitfirst + encryptedString.substring(0, 6).slice(0, 6) + digit + test;

      const order = await Order.create({
        totalPrice: req.body.totalPrice,
        lang: req.body.lang,
        deliveryPrice: req.body.deliveryPrice,
        cutlery: cutlery,
        orderType: 0,
        take: take,
        userId: req.user.id,
        restaurantId: restaurantId,
        locationNameId: req.body.locationId,
        orderDeliveryAddressId: orderDelAdd.id,
        orderStatusId: 1,
        messageCourier: req.body.messageCourier,
        encodedKey: orderIdSecretKey.toUpperCase(),
        mobile: 0,
        web: 1,
      });
      finalOrderId = order.encodedKey;

      let orderId = order.id;
      let orderedProducts = [];
      await Promise.all(
        products.map(async (prod) => {
          const extras = prod.extras;
          orderedProducts.push(prod);
          const orderItem = await OrderItem.create({
            message: prod.message,
            boxPrice: prod.boxPrice,
            variantId: prod.variantId,
            quantity: prod.quantity,
            orderId: orderId,
            variantPrice: prod.productPrice,
          });
          extras.map(async (extras) => {
            await OrderItemExtra.create({
              quantity: prod.quantity,
              orderItemId: orderItem.id,
              extraId: extras.id,
              extraPrice: extras.extraPrice,
            });
          });
        })
      );

      if (req.body.lang == "hu") {
        async function sendSms() {
          var jsonDataObj = {
            to: restaurantPhone,
            sender: "4",
            body: `Kedves Partnerünk! Új rendelés érkezett a Foodnet-en.\nAzonosító: ${finalOrderId}`,
          };
          request.post({
            headers: {
              "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
            },
            url: "https://app.smso.ro/api/v1/send",
            body: jsonDataObj,
            json: true,
          });
        }
        async function sendEmailUser() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;

          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Rendelésed sikeresen elküldted a(z) ${restaurantName} étteremnek. Hamarosan értesítést kapsz az étteremtől.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves ${userName}!</h1>
                                    <p>
                                    Rendelésed sikeresen elküldted a(z) <u>${restaurantName}</u> étteremnek. Hamarosan értesítést kapsz az étteremtől.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                    <p>
                                    Ha szeretnél változtattni a rendeléseden, akkor a következő telefonszámon ezt megteheted: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>. Hívatkozz az következő rendelési számra: ${ordId}.
                                  </p>
                                  <p>Jó étvágyat kíván a Foodnet csapata!</p>
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: userEmail,
            subject: "Sikeres rendelés",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }
        async function sendEmailRestaurant() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;

          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Új rendelés érkezett a Foodnetről.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves partnerünk!</h1>
                                    <p>
                                    Új rendelés érkezett.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                   
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: restaurantEmail,
            subject: "Új rendelés a Foodnetről!",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }

        await sendEmailUser();
        await sendEmailRestaurant();
        await sendSms();
      } else {
        async function sendSms() {
          var jsonDataObj = {
            to: restaurantPhone,
            sender: "4",
            body: `Kedves Partnerünk! Új rendelés érkezett a Foodnet-en.\nAzonosító: ${finalOrderId}`,
          };
          request.post({
            headers: {
              "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
            },
            url: "https://app.smso.ro/api/v1/send",
            body: jsonDataObj,
            json: true,
          });
        }
        async function sendEmailUser() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;

          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Rendelésed sikeresen elküldted a(z) ${restaurantName} étteremnek. Hamarosan értesítést kapsz az étteremtől.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves ${userName}!</h1>
                                    <p>
                                    Rendelésed sikeresen elküldted a(z) <u>${restaurantName}</u> étteremnek. Hamarosan értesítést kapsz az étteremtől.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                    <p>
                                    Ha szeretnél változtattni a rendeléseden, akkor a következő telefonszámon ezt megteheted: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>. Hívatkozz az következő rendelési számra: ${ordId}.
                                  </p>
                                  <p>Jó étvágyat kíván a Foodnet csapata!</p>
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: userEmail,
            subject: "Sikeres rendelés",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }
        async function sendEmailRestaurant() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;

          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Új rendelés érkezett a Foodnetről.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves partnerünk!</h1>
                                    <p>
                                    Új rendelés érkezett.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                   
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: restaurantEmail,
            subject: "Új rendelés a Foodnetről!",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }

        await sendEmailUser();
        await sendEmailRestaurant();
        await sendSms();
      }
    }
    if (token == undefined) {
      const orderDelAdd = await OrderDeliveryAddress.create({
        street: req.body.street,
        houseNumber: req.body.houseNumber,
        floor: req.body.floor,
        doorNumber: req.body.doorNumber,
        phoneNumber: req.body.phone,
        userName: req.body.fullName,
        email: req.body.email,
      });
      var digit = ("" + orderDelAdd.id)[1];
      var digitfirst = ("" + orderDelAdd.id)[0];

      const cryptr = new Cryptr("orderIdSecretKey");
      let test = [0, 1, 2, 3, 4, 5, 7, 8, 9][Math.floor(Math.random() * 9)];

      const encryptedString = cryptr.encrypt(orderDelAdd.id);
      orderIdSecretKey =
        digitfirst + encryptedString.substring(0, 6).slice(0, 6) + digit + test;

      const order = await Order.create({
        totalPrice: req.body.totalPrice,
        cutlery: cutlery,
        orderType: 0,
        take: take,
        restaurantId: restaurantId,
        locationNameId: req.body.locationId,
        messageCourier: req.body.messageCourier,
        orderDeliveryAddressId: orderDelAdd.id,
        deliveryPrice: req.body.deliveryPrice,
        orderStatusId: 1,
        encodedKey: orderIdSecretKey.toUpperCase(),
        mobile: 0,
        lang: req.body.lang,
        web: 1,
      });
      finalOrderId = order.encodedKey;
      let orderId = order.id;
      let orderedProducts = [];
      await Promise.all(
        products.map(async (prod) => {
          const extras = prod.extras;
          orderedProducts.push(prod);
          const orderItem = await OrderItem.create({
            message: prod.message,
            boxPrice: prod.boxPrice,
            variantId: prod.variantId,
            quantity: prod.quantity,
            orderId: orderId,
            variantPrice: prod.productPrice,
          });
          extras.map(async (extras) => {
            await OrderItemExtra.create({
              quantity: prod.quantity,
              orderItemId: orderItem.id,
              extraId: extras.id,
              extraPrice: extras.extraPrice,
            });
          });
        })
      );

      if (req.body.lang == "hu") {
        async function sendSms() {
          var jsonDataObj = {
            to: restaurantPhone,
            sender: "4",
            body: `Kedves Partnerünk! Új rendelés érkezett a Foodnet-en.\nAzonosító: ${finalOrderId}`,
          };
          request.post({
            headers: {
              "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
            },
            url: "https://app.smso.ro/api/v1/send",
            body: jsonDataObj,
            json: true,
          });
        }
        async function sendEmailUser() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;
          userName = req.body.fullName;
          userEmail = req.body.email;
          orderPhoneNumber = req.body.phone;
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Rendelésed sikeresen elküldted a(z) ${restaurantName} étteremnek. Hamarosan értesítést kapsz az étteremtől.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves ${userName}!</h1>
                                    <p>
                                    Rendelésed sikeresen elküldted a(z) <u>${restaurantName}</u> étteremnek. Hamarosan értesítést kapsz az étteremtől.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                    <p>
                                    Ha szeretnél változtattni a rendeléseden, akkor a következő telefonszámon ezt megteheted: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>. Hívatkozz az következő rendelési számra: ${ordId}.
                                  </p>
                                  <p>Jó étvágyat kíván a Foodnet csapata!</p>
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: userEmail,
            subject: "Sikeres rendelés",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            console.log(body);
            if (error) {
              console.log(error);
            }
          });
        }
        async function sendEmailRestaurant() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;
          userName = req.body.fullName;
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Új rendelés érkezett a Foodnetről.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves partnerünk!</h1>
                                    <p>
                                    Új rendelés érkezett.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                   
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: restaurantEmail,
            subject: "Új rendelés a Foodnetről!",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }
        await sendEmailUser();
        await sendEmailRestaurant();
        await sendSms();
      } else {
        async function sendSms() {
          var jsonDataObj = {
            to: restaurantPhone,
            sender: "4",
            body: `Kedves Partnerünk! Új rendelés érkezett a Foodnet-en.\nAzonosító: ${finalOrderId}`,
          };
          request.post({
            headers: {
              "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
            },
            url: "https://app.smso.ro/api/v1/send",
            body: jsonDataObj,
            json: true,
          });
        }
        async function sendEmailUser() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;
          userName = req.body.fullName;
          userEmail = req.body.email;
          orderPhoneNumber = req.body.phone;
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Rendelésed sikeresen elküldted a(z) ${restaurantName} étteremnek. Hamarosan értesítést kapsz az étteremtől.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves ${userName}!</h1>
                                    <p>
                                    Rendelésed sikeresen elküldted a(z) <u>${restaurantName}</u> étteremnek. Hamarosan értesítést kapsz az étteremtől.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                    <p>
                                    Ha szeretnél változtattni a rendeléseden, akkor a következő telefonszámon ezt megteheted: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>. Hívatkozz az következő rendelési számra: ${ordId}.
                                  </p>
                                  <p>Jó étvágyat kíván a Foodnet csapata!</p>
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: userEmail,
            subject: "Sikeres rendelés",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            console.log(body);
            if (error) {
              console.log(error);
            }
          });
        }
        async function sendEmailRestaurant() {
          let ordId = orderIdSecretKey.toUpperCase();
          orderStreet = req.body.street;
          orderHouseNumber = req.body.houseNumber;
          orderFloor = req.body.floor;
          orderDoorNumber = req.body.doorNumber;
          userName = req.body.fullName;
          var orderInfo = {
            orderedProducts,
            orderStreet,
            orderHouseNumber,
            orderFloor,
            orderDoorNumber,
            orderPhoneNumber,
            userName,
            orderedLocation,
            locationType,
            deliveredPrice,
            noDelivery,
            deliveredPrice,
            finSum,
            ordId,
            restaurantName,
            restaurantPhone,
          };

          var text = ejs.render(
            `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
                <title></title>
                <style type="text/css" rel="stylesheet" media="all">
                  /* Base ------------------------------ */
            
                  @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
                  body {
                    width: 100% !important;
                    height: 100%;
                    margin: 0;
                    -webkit-text-size-adjust: none;
                  }
            
                  a {
                    color: #3869d4;
                  }
            
                  a img {
                    border: none;
                  }
            
                  td {
                    word-break: break-word;
                  }
            
                  .preheader {
                    display: none !important;
                    visibility: hidden;
                    mso-hide: all;
                    font-size: 1px;
                    line-height: 1px;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                  }
                  /* Type ------------------------------ */
            
                  body,
                  td,
                  th {
                    font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
                  }
            
                  h1 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 22px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h2 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  h3 {
                    margin-top: 0;
                    color: #333333;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: left;
                  }
            
                  td,
                  th {
                    font-size: 16px;
                  }
            
                  p,
                  ul,
                  ol,
                  blockquote {
                    margin: 0.4em 0 1.1875em;
                    font-size: 16px;
                    line-height: 1.625;
                  }
            
                  p.sub {
                    font-size: 13px;
                  }
                  /* Utilities ------------------------------ */
            
                  .align-right {
                    text-align: right;
                  }
            
                  .align-left {
                    text-align: left;
                  }
            
                  .align-center {
                    text-align: center;
                  }
                  /* Buttons ------------------------------ */
            
                  .button {
                    background-color: #3869d4;
                    border-top: 10px solid #3869d4;
                    border-right: 18px solid #3869d4;
                    border-bottom: 10px solid #3869d4;
                    border-left: 18px solid #3869d4;
                    display: inline-block;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 3px;
                    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
                    -webkit-text-size-adjust: none;
                    box-sizing: border-box;
                  }
            
                  .button--green {
                    background-color: #22bc66;
                    border-top: 10px solid #22bc66;
                    border-right: 18px solid #22bc66;
                    border-bottom: 10px solid #22bc66;
                    border-left: 18px solid #22bc66;
                  }
            
                  .button--red {
                    background-color: #ff6136;
                    border-top: 10px solid #ff6136;
                    border-right: 18px solid #ff6136;
                    border-bottom: 10px solid #ff6136;
                    border-left: 18px solid #ff6136;
                  }
            
                  @media only screen and (max-width: 500px) {
                    .button {
                      width: 100% !important;
                      text-align: center !important;
                    }
                  }
                  /* Attribute list ------------------------------ */
            
                  .attributes {
                    margin: 0 0 21px;
                  }
            
                  .attributes_content {
                    background-color: #f4f4f7;
                    padding: 16px;
                  }
            
                  .attributes_item {
                    padding: 0;
                  }
                  /* Related Items ------------------------------ */
            
                  .related {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .related_item {
                    padding: 10px 0;
                    color: #cbcccf;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .related_item-title {
                    display: block;
                    margin: 0.5em 0 0;
                  }
            
                  .related_item-thumb {
                    display: block;
                    padding-bottom: 10px;
                  }
            
                  .related_heading {
                    border-top: 1px solid #cbcccf;
                    text-align: center;
                    padding: 25px 0 10px;
                  }
                  /* Discount Code ------------------------------ */
            
                  .discount {
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f4f4f7;
                    border: 2px dashed #cbcccf;
                  }
            
                  .discount_heading {
                    text-align: center;
                  }
            
                  .discount_body {
                    text-align: center;
                    font-size: 15px;
                  }
                  /* Social Icons ------------------------------ */
            
                  .social {
                    width: auto;
                  }
            
                  .social td {
                    padding: 0;
                    width: auto;
                  }
            
                  .social_icon {
                    height: 20px;
                    margin: 0 8px 10px 8px;
                    padding: 0;
                  }
                  /* Data table ------------------------------ */
            
                  .purchase {
                    width: 100%;
                    margin: 0;
                    padding: 35px 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_content {
                    width: 100%;
                    margin: 0;
                    padding: 25px 0 0 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .purchase_item {
                    padding: 10px 0;
                    color: #51545e;
                    font-size: 15px;
                    line-height: 18px;
                  }
            
                  .purchase_heading {
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eaeaec;
                  }
            
                  .purchase_heading p {
                    margin: 0;
                    color: #85878e;
                    font-size: 12px;
                  }
            
                  .purchase_footer {
                    padding-top: 15px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .purchase_total {
                    margin: 0;
                    text-align: right;
                    font-weight: bold;
                    color: #333333;
                  }
            
                  .purchase_total--label {
                    padding: 0 15px 0 0;
                  }
            
                  body {
                    background-color: #f2f4f6;
                    color: #51545e;
                  }
            
                  p {
                    color: #51545e;
                  }
            
                  .email-wrapper {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #f2f4f6;
                  }
            
                  .email-content {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
                  /* Masthead ----------------------- */
            
                  .email-masthead {
                    padding: 25px 0;
                    text-align: center;
                  }
            
                  .email-masthead_logo {
                    width: 94px;
                  }
            
                  .email-masthead_name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #a8aaaf;
                    text-decoration: none;
                    text-shadow: 0 1px 0 white;
                  }
                  /* Body ------------------------------ */
            
                  .email-body {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                  }
            
                  .email-body_inner {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    background-color: #ffffff;
                  }
            
                  .email-footer {
                    width: 570px;
                    margin: 0 auto;
                    padding: 0;
                    -premailer-width: 570px;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .email-footer p {
                    color: #a8aaaf;
                  }
            
                  .body-action {
                    width: 100%;
                    margin: 30px auto;
                    padding: 0;
                    -premailer-width: 100%;
                    -premailer-cellpadding: 0;
                    -premailer-cellspacing: 0;
                    text-align: center;
                  }
            
                  .body-sub {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid #eaeaec;
                  }
            
                  .content-cell {
                    padding: 45px;
                  }
                  /*Media Queries ------------------------------ */
            
                  @media only screen and (max-width: 600px) {
                    .email-body_inner,
                    .email-footer {
                      width: 100% !important;
                    }
                  }
            
                  @media (prefers-color-scheme: dark) {
                    body,
                    .email-body,
                    .email-body_inner,
                    .email-content,
                    .email-wrapper,
                    .email-masthead,
                    .email-footer {
                      background-color: #333333 !important;
                      color: #fff !important;
                    }
                    p,
                    ul,
                    ol,
                    blockquote,
                    h1,
                    h2,
                    h3,
                    span,
                    .purchase_item {
                      color: #fff !important;
                    }
                    .attributes_content,
                    .discount {
                      background-color: #222 !important;
                    }
                    .email-masthead_name {
                      text-shadow: none !important;
                    }
                  }
            
                  :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                  }
                </style>
                <!--[if mso]>
                  <style type="text/css">
                    .f-fallback {
                      font-family: Arial, sans-serif;
                    }
                  </style>
                <![endif]-->
              </head>
              <body>
                <span class="preheader"
                  >Új rendelés érkezett a Foodnetről.</span
                >
                <table
                  class="email-wrapper"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        class="email-content"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td class="email-masthead">
                            <a
                              href="https://example.com"
                              class="f-fallback email-masthead_name"
                            >
                              Foodnet
                            </a>
                          </td>
                        </tr>
                        <!-- Email Body -->
                        <tr>
                          <td
                            class="email-body"
                            width="570"
                            cellpadding="0"
                            cellspacing="0"
                          >
                            <table
                              class="email-body_inner"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <!-- Body content -->
                              <tr>
                                <td class="content-cell">
                                  <div class="f-fallback">
  
  
                                 
  
  
  
                                    <h1>Kedves partnerünk!</h1>
                                    <p>
                                    Új rendelés érkezett.
  
                                   
                                    </p>
                                    <table
                                      class="attributes"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                    >
                                      <tr>
                                        <td class="attributes_content">
                                          <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                          >
                                            <tr>
                                              <td class="attributes_item">
                                                <span class="f-fallback">
                                                  <strong>Név:</strong> <%= userName %>
                                                </span>
                                              </td>
                                            </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Telefonszám:</strong> <%= orderPhoneNumber %>
                                              </span>
                                            </td>
                                          </tr>
                                            <tr>
                                            <td class="attributes_item">
                                              <span class="f-fallback">
                                                <strong>Helység</strong> <%= orderedLocation %>
                                              </span>
                                            </td>
                                          </tr>
                                          <tr>
                                          <td class="attributes_item">
                                            <span class="f-fallback">
                                              <strong>Utca:</strong> <%= orderStreet %>
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                        <td class="attributes_item">
                                          <span class="f-fallback">
                                            <strong>Házszám:</strong> <%= orderHouseNumber %>
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                      <td class="attributes_item">
                                        <span class="f-fallback">
                                          <strong>Emelet:</strong> <%= orderFloor %>
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                    <td class="attributes_item">
                                      <span class="f-fallback">
                                        <strong>Ajtószám:</strong> <%= orderDoorNumber %>
                                      </span>
                                    </td>
                                  </tr>
                                 
                                            
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <!-- Action -->
                                    
                                        
                                    <table
                                      class="purchase"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                    >
                                      <tr>
                                        <td>
                                          <h3>Rendelési azonosító: <%= ordId %></h3>
                                        </td>
                                        <td>
                                          <h3 class="align-right">Ár</h3>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colspan="2">
                                          <table
                                            class="purchase_content"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                          >
                                          <% for(var i=0; i < orderedProducts.length; i++) { %>
                                          <%= orderedProducts[i].quantity %> * <%= orderedProducts[i].productName %> - <%= orderedProducts[i].productPrice * orderedProducts[i].quantity %> RON
                                          <% if(orderedProducts[i].boxPrice !=0) { %>
                                          <tr>
                                          <th class="purchase_heading" align="left">
                                            <p class="f-fallback"><%= orderedProducts[i].quantity %> * Csomagolás</p>
                                          </th>
                                          <th class="purchase_heading" align="right">
                                            <p class="f-fallback"><%= orderedProducts[i].boxPrice * orderedProducts[i].quantity %> RON</p>
                                          </th>
                                        </tr>
                                        <% } %>
                                          <% for(var j=0; j < orderedProducts[i].extras.length; j++) { %>
                                            <% if(orderedProducts[i].extras[j].length !=0) { %>
                                            <tr>
                                              <th class="purchase_heading" align="left">
                                                <p class="f-fallback"><%= orderedProducts[i].quantity %> * <%= orderedProducts[i].extras[j].extraName %></p>
                                              </th>
                                              <th class="purchase_heading" align="right">
                                                <p class="f-fallback"><%= orderedProducts[i].extras[j].extraPrice * orderedProducts[i].quantity %> RON</p>
                                              </th>
                                            </tr>
                                          
                                            <% } %>
                                            <% } %>
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                
                                              </td>
                                            </tr>
                                            <% } %>
                                            <tr>
                                            <td width="80%" class="purchase_item">
                                              <span class="f-fallback"
                                                >Szállítási költség</span
                                              >
                                            </td>
                                            <td
                                              class="align-right"
                                              width="20%"
                                              class="purchase_item"
                                            >
                                              <span class="f-fallback"><%= deliveredPrice %> RON</span>
                                            </td>
                                          </tr>
                                            
                                            <tr>
                                              <td
                                                width="80%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p
                                                  class="f-fallback purchase_total purchase_total--label"
                                                >
                                                  Végösszeg
                                                </p>
                                              </td>
                                              <td
                                                width="20%"
                                                class="purchase_footer"
                                                valign="middle"
                                              >
                                                <p class="f-fallback purchase_total">
                                                <%= finSum %> RON
                                                </p>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                   
                                   
                               
                                  
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table
                              class="email-footer"
                              align="center"
                              width="570"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                            >
                              <tr>
                                <td class="content-cell" align="center">
                                  <p class="f-fallback sub align-center">
                                    &copy; 2021 Foodnet. Minden jog fenntartva.
                                  </p>
                                  <p class="f-fallback sub align-center">
                                    Forcefit Titan Srl.
                                    <br />Gyergyóalfalu, 820 szám, Princsipală<br />Postakód: 537130
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            `,
            orderInfo
          );

          const data = {
            from: "info@foodnet.ro",
            to: restaurantEmail,
            subject: "Új rendelés a Foodnetről!",
            html: text,
          };
          await mg.messages().send(data, function (error, body) {
            if (error) {
              console.log(error);
            }
          });
        }
        await sendEmailUser();
        await sendEmailRestaurant();
        await sendSms();
      }
    }

    // if (token != undefined) {
    //   const generatedLink =
    //     Math.random().toString(36).substring(7) + req.user.id;
    //   await RestaurantReview.create({
    //     restaurantId: restaurantId,
    //     userId: req.user.id,
    //     genLink: generatedLink,
    //     reviewActive: 0,
    //   });
    // }
    return res.json({
      status: 200,
      msg: "Order success",
      finalOrderId,
    });
  } catch (err) {
    console.log(err);
    return res.json({
      status: 500,
      msg: "Server error",
      result: [],
    });
  }
});

router.get("/", auth, async (req, res) => {
  let result = [];
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{ model: Restaurant }],
    });

    for (let i = 0; i < orders.length; i++) {
      const createdTime = orders[i].createdAt.toLocaleString("en-GB", {
        timeZone: "Europe/Helsinki",
      });
      const items = {
        order_id: orders[i].encodedKey,
        restaurant_name: orders[i].Restaurant.fullName,
        total: orders[i].totalPrice,
        time: createdTime,
      };
      result.push(items);
    }
    return res.json({
      status: 200,
      msg: "Delivery address successfully created",
      result,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      status: 500,
      msg: "Server error",
      result: [],
    });
  }
});

router.get("/:lang/:id", auth, async (req, res) => {
  try {
    let languageCode;

    if (req.params.lang == "ro") {
      languageCode = 1;
    } else if (req.params.lang == "hu") {
      languageCode = 2;
    } else {
      languageCode = 3;
    }
    const orders = await Order.findAll({
      order: [["createdAt", "DESC"]],
      where: { userId: req.user.id, encodedKey: req.params.id },
      include: [
        {
          model: OrderItem,

          include: [
            {
              model: OrderItemExtra,
              include: [
                {
                  model: Extra,
                  include: [
                    {
                      model: ExtraTranslation,
                      where: { languageId: languageCode },
                    },
                  ],
                },
              ],
            },
            {
              model: Variant,
              include: [
                {
                  model: ProductFinal,
                  where: { active: 1 },
                  include: [
                    {
                      model: Product,
                      include: [
                        {
                          model: ProductTranslation,
                          where: { languageId: languageCode },
                        },
                        {
                          model: ProductHasAllergen,
                          where: { active: 1 },
                          include: [
                            {
                              model: Allergen,
                              include: [
                                {
                                  model: AllergenTranslation,
                                  where: { languageId: languageCode },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { model: OrderDeliveryAddress },
        {
          model: User,
        },
        { model: OrderDeliveryAddress },

        {
          model: LocationName,
          include: [
            {
              model: LocationNameTranslation,
              where: { languageId: languageCode },
            },
          ],
        },
      ],
    });

    let extras = [];
    let deliveryAddress = [];
    let allergenName = [];
    let extrasArray = [];
    let orderId;
    let orderCreatedAt;
    if (orders.length != 0) {
      for (let i = 0; i < orders.length; i++) {
        const resultWithAll = [];
        orderId = orders[i].encodedKey;
        let orderItems = orders[i].OrderItems;
        orderCreatedAt = orders[i].createdAt.toLocaleString("en-GB", {
          timeZone: "Europe/Helsinki",
        });

        const deliveryItems = {
          door_number: orders[i].OrderDeliveryAddress.doorNumber,
          floor: orders[i].OrderDeliveryAddress.floor,
          house_number: orders[i].OrderDeliveryAddress.houseNumber,
          street: orders[i].OrderDeliveryAddress.street,
          city: orders[i].LocationName.LocationNameTranslations[0].name,
        };
        deliveryAddress.push(deliveryItems);
        for (let j = 0; j < orderItems.length; j++) {
          extras = orderItems[j].OrderItemExtras;

          let prodFin = orderItems[j].Variant.ProductFinals;
          for (let h = 0; h < prodFin.length; h++) {
            for (
              let s = 0;
              s < prodFin[h].Product.ProductHasAllergens.length;
              s++
            ) {
              allergenName.push(
                prodFin[h].Product.ProductHasAllergens[s].Allergen
                  .AllergenTranslations[0].name
              );
            }

            if (extras.length == 0) {
              let totalProductPrice = 0;

              totalProductPrice +=
                parseFloat(orderItems[j].variantPrice) *
                parseInt(orderItems[j].quantity);
              const items = {
                orderItemId: orderItems[j].id,

                product_id: prodFin[h].productId,
                product_quantity: orderItems[j].quantity,
                message: orderItems[j].message,
                product_imageUrl: prodFin[h].Product.productImagePath,
                product_price: orderItems[j].variantPrice,
                product_name: prodFin[h].Product.ProductTranslations[0].title,
                product_description:
                  prodFin[h].Product.ProductTranslations[0].description,
                total_product_price: totalProductPrice,
                allergenName,
              };

              resultWithAll.push(items);
            } else {
              for (let k = 0; k < extras.length; k++) {
                extrasArray.push(extras[k]);
                let totalProductPrice = 0;
                let totalExtraPrice = 0;

                totalProductPrice +=
                  parseFloat(orderItems[j].variantPrice) *
                  parseInt(orderItems[j].quantity);
                totalExtraPrice +=
                  parseFloat(extras[k].extraPrice) *
                  parseInt(extras[k].quantity);
                const items = {
                  orderItemId: orderItems[j].id,
                  product_id: prodFin[h].productId,
                  product_imageUrl: prodFin[h].Product.productImagePath,
                  product_quantity: orderItems[j].quantity,
                  product_price: orderItems[j].variantPrice,
                  product_name: prodFin[h].Product.ProductTranslations[0].title,
                  extra_id: extras[k].extraId,
                  extra_quantity: extras[k].quantity,
                  extra_price: extras[k].extraPrice,
                  extra_name: extras[k].Extra.ExtraTranslations[0].name,
                  total_product_price: totalProductPrice,
                  total_extra_price: totalExtraPrice,
                  message: orderItems[j].message,
                  product_description:
                    prodFin[h].Product.ProductTranslations[0].description,
                  allergenName: allergenName,
                };

                resultWithAll.push(items);
              }
            }
          }
        }

        const result = resultWithAll.reduce((acc, val) => {
          const {
            extra_id,
            extra_quantity,
            extra_price,
            extra_name,
            ...otherFields
          } = val;

          const existing = acc.find(
            (item) => item.orderItemId === val.orderItemId
          );
          if (!existing) {
            acc.push({
              ...otherFields,
              extras: [
                {
                  extra_id,
                  extra_quantity,
                  extra_price,
                  extra_name,
                },
              ],
            });
            return acc;
          }

          existing.extras.push({
            extra_id,
            extra_quantity,
            extra_price,
            extra_name,
          });
          return acc;
        }, []);
        orders[i].products = result;

        return res.json({
          status: 200,
          msg: "Order detail successfully opened",
          result,
          deliveryAddress,
          orderId,
          orderCreatedAt,
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.json({
      status: 500,
      msg: "Server error",
      result: [],
    });
  }
});

module.exports = router;
