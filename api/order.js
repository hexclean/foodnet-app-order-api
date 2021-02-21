const express = require("express");
const router = express.Router();
const OrderItemExtra = require("../models/OrderItemExtra");
const Order = require("../models/Order");
const Extra = require("../models/Extra");
const User = require("../models/User");
const OrderItem = require("../models/OrderItem");
const ProductFinal = require("../models/ProductFinal");
const LocationName = require("../models/LocationName");
const OrderDeliveryAddress = require("../models/OrderDeliveryAddress");
const auth = require("../middleware/auth");
const Variant = require("../models/Variant");
const Product = require("../models/Product");
const ProductTranslation = require("../models/ProductTranslation");
const ExtraTranslation = require("../models/ExtraTranslation");
const LocationNameTranslation = require("../models/LocationNameTranslation");
const Restaurant = require("../models/Restaurant");
const RestaurantNoti = require("../models/RestaurantNoti");
const mailgun = require("mailgun-js");
const DOMAIN = "mg.foodnet.ro";
const api_key = "key-6469129ca0603f9588c2a57c3b46defe";
var FCM = require("fcm-notification");
var serverKey = require("../firebase-noti/foodnet-order-noti.json");

var fcm = new FCM(serverKey);

const mg = mailgun({
  apiKey: api_key,
  domain: DOMAIN,
  host: "api.eu.mailgun.net",
});

// var ema = require("../test.ejs");
// @route    POST api/orders
// @desc     Create an order
// @access   Private

router.get("/:lang/:id", auth, async (req, res) => {
  let languageCode;
  let orderList = [];
  if (req.params.lang == "ro") {
    languageCode = 1;
  } else {
    languageCode = 2;
  }

  const orders = await Order.findAll({
    where: {
      orderStatusId: 1,
      restaurantId: req.admin.id,
      encodedKey: req.params.id,
    },
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
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { model: OrderDeliveryAddress },
      { model: User },
      { model: Restaurant },
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

  let deliveryPriceCity;
  let extras = [];
  let total;
  let cutlery;
  let take;
  let userName;
  let orderStreet;
  let orderHouseNumber;
  let orderFloor;
  let orderDoorNumber;
  let orderPhoneNumber;
  let orderCreated;
  let orderId;
  let deliveredPrice;
  let location;
  let locationId;
  let messageCourier;
  let deliveryPriceVillage;

  for (let i = 0; i < orders.length; i++) {
    const resultWithAll = [];
    let orderItems = orders[i].OrderItems;

    for (let j = 0; j < orderItems.length; j++) {
      extras = orderItems[j].OrderItemExtras;

      let prodFin = orderItems[j].Variant.ProductFinals;
      for (let h = 0; h < prodFin.length; h++) {
        if (extras.length == 0) {
          let totalProductPrice = 0;
          let totalBoxPrice = 0;
          totalProductPrice +=
            parseFloat(orderItems[j].variantPrice) *
            parseInt(orderItems[j].quantity);
          totalBoxPrice +=
            parseFloat(orderItems[j].boxPrice) *
            parseInt(orderItems[j].quantity);
          const items = {
            orderItemId: orderItems[j].id,
            boxPrice: orderItems[j].boxPrice,
            totalBoxPrice: totalBoxPrice.toFixed(2),
            variant_sku: orderItems[j].Variant.sku,
            extra_length: extras.length,
            product_id: prodFin[h].productId,
            product_quantity: orderItems[j].quantity,
            message: orderItems[j].message,
            product_price: orderItems[j].variantPrice,
            product_name: prodFin[h].Product.ProductTranslations[0].title,
            total_product_price: totalProductPrice,
          };

          resultWithAll.push(items);
        } else {
          for (let k = 0; k < extras.length; k++) {
            let totalExtraPrice = 0;
            let totalProductPrice = 0;
            let totalBoxPrice = 0;
            let totalSection = 0;
            let totalSectionNoBox = 0;
            let extraPlusProduct = 0;
            totalExtraPrice +=
              parseFloat(extras[k].extraPrice) * parseInt(extras[k].quantity);
            // console.log("totalExtraPrice");

            totalProductPrice +=
              parseFloat(orderItems[j].variantPrice) *
              parseInt(orderItems[j].quantity);

            totalBoxPrice +=
              parseFloat(orderItems[j].boxPrice) *
              parseInt(orderItems[j].quantity);

            totalSection +=
              parseFloat(totalBoxPrice) +
              parseFloat(totalExtraPrice) +
              parseFloat(totalProductPrice);

            totalSectionNoBox +=
              parseFloat(totalExtraPrice) + parseFloat(totalProductPrice);

            const items = {
              orderItemId: orderItems[j].id,
              variant_sku: orderItems[j].Variant.sku,
              totalBoxPrice: totalBoxPrice.toFixed(2),
              boxPrice: orderItems[j].boxPrice,
              totalSection: totalSection,
              totalSectionNoBox: totalSectionNoBox,
              extra_length: extras.length,
              product_id: prodFin[h].productId,
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
            };

            resultWithAll.push(items);
          }
        }
      }
    }

    deliveryPriceVillage = orders[0].Restaurant.deliveryPriceVillage;
    deliveryPriceCity = orders[0].Restaurant.deliveryPriceCity;
    locationId = orders[0].locationId;
    const checkLocId = await LocationName.findByPk(locationId);

    if (checkLocId == 1) {
      deliveredPrice = deliveryPriceVillage;
    } else {
      deliveredPrice = deliveryPriceCity;
    }

    const reduced = resultWithAll.reduce((acc, val) => {
      const {
        extra_id,
        extra_quantity,
        extra_price,
        extra_name,
        ...otherFields
      } = val;

      const existing = acc.find((item) => item.orderItemId === val.orderItemId);
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

    orders[i].products = reduced;
    orderList = reduced;

    cutlery = orders[0].cutlery;
    take = orders[0].take;
    orderStreet = orders[0].OrderDeliveryAddress.street;
    orderHouseNumber = orders[0].OrderDeliveryAddress.houseNumber;
    orderFloor = orders[0].OrderDeliveryAddress.floor;
    orderDoorNumber = orders[0].OrderDeliveryAddress.doorNumber;
    orderPhoneNumber = orders[0].OrderDeliveryAddress.phoneNumber;
    orderCreated = orders[0].createdAt.toLocaleString("en-GB", {
      timeZone: "Europe/Helsinki",
    });
    total = orders[0].totalPrice;
    userName = orders[0].OrderDeliveryAddress.userName;
    orderId = orders[0].encodedKey;
    location = orders[0].LocationName.LocationNameTranslations[0].name;
    messageCourier = orders[0].messageCourier;
  }

  res.json({
    status: 200,
    msg: "Success",
    result: orderList,
    cutlery,
    take,
    orderStreet,
    orderHouseNumber,
    orderFloor,
    orderDoorNumber,
    orderPhoneNumber,
    orderCreated,
    userName,
    orderId,
    total,
    location,
    messageCourier,
    deliveredPrice,
  });
});

router.get("/:lang/order-list/new", auth, async (req, res) => {
  try {
    let languageCode;

    if (req.params.lang == "ro") {
      languageCode = 1;
    } else {
      languageCode = 2;
    }
    const orders = await Order.findAll({
      order: [["createdAt", "DESC"]],
      where: { restaurantId: req.admin.id, orderStatusId: 1 },
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

    let result = [];
    if (orders.length != 0) {
      for (let i = 0; i < orders.length; i++) {
        const resultArr = {
          id: orders[i].encodedKey,
          location: orders[i].LocationName.LocationNameTranslations[0].name,
          totalPrice: orders[i].totalPrice,
          createdAt: orders[i].createdAt.toLocaleString("en-GB", {
            timeZone: "Europe/Helsinki",
          }),
          type: orders[i].orderStatusId,
        };
        result.push(resultArr);
      }
    } else {
      return res.json({
        status: 200,
        msg: "Order not found",
        result: [],
      });
    }

    return res.json({
      status: 200,
      msg: "Order detail successfully opened",
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

router.get("/:lang/order-list/accepted", auth, async (req, res) => {
  try {
    let languageCode;

    if (req.params.lang == "ro") {
      languageCode = 1;
    } else {
      languageCode = 2;
    }
    const orders = await Order.findAll({
      order: [["createdAt", "DESC"]],
      where: { restaurantId: req.admin.id, orderStatusId: 2 },
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

    let result = [];
    if (orders.length != 0) {
      for (let i = 0; i < orders.length; i++) {
        const resultArr = {
          id: orders[i].encodedKey,
          location: orders[i].LocationName.LocationNameTranslations[0].name,
          totalPrice: orders[i].totalPrice,
          createdAt: orders[i].createdAt.toLocaleString("en-GB", {
            timeZone: "Europe/Helsinki",
          }),
          type: orders[i].orderStatusId,
        };
        result.push(resultArr);
      }
    } else {
      return res.json({
        status: 200,
        msg: "Order not found",
        result: [],
      });
    }

    return res.json({
      status: 200,
      msg: "Order detail successfully opened",
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

router.get("/:lang/order-list/rejected", auth, async (req, res) => {
  try {
    let languageCode;

    if (req.params.lang == "ro") {
      languageCode = 1;
    } else {
      languageCode = 2;
    }
    const orders = await Order.findAll({
      order: [["createdAt", "DESC"]],
      where: { restaurantId: req.admin.id, orderStatusId: 3 },
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

    let result = [];
    if (orders.length != 0) {
      for (let i = 0; i < orders.length; i++) {
        const resultArr = {
          id: orders[i].encodedKey,
          location: orders[i].LocationName.LocationNameTranslations[0].name,
          totalPrice: orders[i].totalPrice,
          createdAt: orders[i].createdAt.toLocaleString("en-GB", {
            timeZone: "Europe/Helsinki",
          }),
          type: orders[i].orderStatusId,
        };
        result.push(resultArr);
      }
    } else {
      return res.json({
        status: 200,
        msg: "Order not found",
        result: [],
      });
    }

    return res.json({
      status: 200,
      msg: "Order detail successfully opened",
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

router.get("/cronjobhueckztxc", auth, async (req, res) => {
  try {
    const orders = [];
    const checkDevice = await Order.findAll({
      where: { orderStatusId: 1 },
      include: [{ model: Restaurant, include: [{ model: RestaurantNoti }] }],
    });
    let restaurantLang = checkDevice.lang;
    let restaurantDeviceToken = [];
    for (let i = 0; i < checkDevice.length; i++) {
      restaurantDeviceToken.push(
        checkDevice[i].Restaurant.RestaurantNotis[0].deviceToken
      );
    }

    var message = {
      data: {
        score: "850",
        time: "2:45",
      },

      notification: {
        title: "FOODNET EMLÉKEZTETŐ",
        body: "Új rendelésed érkezett",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      token: restaurantDeviceToken,
    };
    await fcm.sendToMultipleToken(
      message,
      restaurantDeviceToken,
      function (err, response) {
        if (err) {
          console.log("error found", err);
        } else {
          console.log("response here", response);
        }
      }
    );
    // }
    // else {
    //   var message = {
    //     data: {
    //       //This is only optional, you can send any data
    //       score: "850",
    //       time: "2:45",
    //     },
    //     notification: {
    //       title: "FOODNET EMLÉKEZTETŐ",
    //       body: "Új rendelésed érkezett",
    //       // sound: "default",
    //     },
    //     token: restaurantDeviceToken,
    //     // sound: "default",
    //   };
    //   await fcm.sendToMultipleToken(
    //     message,
    //     restaurantDeviceToken,

    //     function (err, response) {
    //       if (err) {
    //         console.log("error found", err);
    //       } else {
    //         console.log("response here", response);
    //       }
    //     }
    //   );
    // }
    return res.json({
      status: 200,
      msg: "Order detail successfully opened",
      restaurantDeviceToken,
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

router.post("/operation", auth, async (req, res) => {
  const minutes = req.body.acceptedTime;

  const failedDescription = req.body.rejectMessage;
  const orderId = req.body.orderId;

  const rest = await Restaurant.findByPk(req.admin.id);
  const ordered = await Order.findOne({
    where: { encodedKey: orderId },
    include: [{ model: OrderDeliveryAddress }],
  });
  const orderedUserName = ordered.OrderDeliveryAddress.userName;
  const orderedUserPhoneNumber = ordered.OrderDeliveryAddress.phoneNumber;
  const orderedUserEmail = ordered.OrderDeliveryAddress.email;
  let restaurantName = rest.fullName;
  let restaurantPhone = rest.phoneNumber;
  const orderedLang = ordered.lang;

  try {
    if (failedDescription.length == 0) {
      await Order.update(
        { orderStatusId: 2 },
        { where: { encodedKey: orderId } }
      );
      if (orderedLang == "hu") {
        var jsonDataObj = {
          to: orderedUserPhoneNumber,
          sender: "4",
          body: `Kedves ${orderedUserName}! A(z) ${restaurantName} sikeresen elfogadta a rendelésed, melynek rendelési száma: ${orderId}. A rendelésed várhatóan ${minutes} perc múlva érkezik. További információkért az étterem telefonszámán érdeklődhetsz: ${restaurantPhone}.\nJó étvágyat kíván a Foodnet csapata!`,
        };

        const data = {
          from: "info@foodnet.ro",
          to: orderedUserEmail,
          subject: "Kiszállítási idő",
          html: `
             
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
                  background-color: #f4f4f7;
                  color: #51545e;
                }
          
                p {
                  color: #51545e;
                }
          
                p.sub {
                  color: #6b6e76;
                }
          
                .email-wrapper {
                  width: 100%;
                  margin: 0;
                  padding: 0;
                  -premailer-width: 100%;
                  -premailer-cellpadding: 0;
                  -premailer-cellspacing: 0;
                  background-color: #f4f4f7;
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
                  background-color: #ffffff;
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
                  color: #6b6e76;
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
                  padding: 35px;
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
                >Köszönjük, hogy regisztráltál a Foodnet rendszerébe. Igérjük, hogy izgalmas meglepetésekben...</span
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
                          width="100%"
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
                                  <h1>Kedves ${orderedUserName}!</h1>
                                  
                                  <p>
                                  A(z) ${restaurantName} sikeresen elfogadta a rendelésed, melynek rendelési száma: ${orderId}. A rendelésed várhatóan ${minutes} perc múlva érkezik. További információkért az étterem telefonszámán érdeklődhetsz: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>.
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
                                  <br />Principală 820 <br />Postakód 537130
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
        };
        async function sendSms() {
          request.post(
            {
              headers: {
                "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
              },
              url: "https://app.smso.ro/api/v1/send",
              body: jsonDataObj,
              json: true,
            },
            function (error, response, body) {
              console.log(error);
              console.log(response);
              console.log(body);
            }
          );
        }
        // await sendSms();
        // await mg.messages().send(data, function (error, body) {
        //   if (error) {
        //     console.log(error);
        //   }
        // });
      } else {
        var jsonDataObj = {
          to: orderedUserPhoneNumber,
          sender: "4",
          body: `Stimate ${orderedUserName}! Restaurantul ${restaurantName} a acceptar comanda dvs. cu numărul: ${orderId}. Meniul comandat va fi livrat aproximativ în ${minutes} minute. Pentru alte informații sunați la nr. telefon al restaurantului: ${restaurantPhone}.\nPoftă bună! - echipa Foodnet.`,
        };

        async function sendSms() {
          request.post(
            {
              headers: {
                "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
              },
              url: "https://app.smso.ro/api/v1/send",
              body: jsonDataObj,
              json: true,
            },
            function (error, response, body) {
              console.log(error);
              console.log(response);
              console.log(body);
            }
          );
        }

        const data = {
          from: "info@foodnet.ro",
          to: orderedUserEmail,
          subject: "Kiszállítási idő",
          html: `
             
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
                  background-color: #f4f4f7;
                  color: #51545e;
                }
          
                p {
                  color: #51545e;
                }
          
                p.sub {
                  color: #6b6e76;
                }
          
                .email-wrapper {
                  width: 100%;
                  margin: 0;
                  padding: 0;
                  -premailer-width: 100%;
                  -premailer-cellpadding: 0;
                  -premailer-cellspacing: 0;
                  background-color: #f4f4f7;
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
                  background-color: #ffffff;
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
                  color: #6b6e76;
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
                  padding: 35px;
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
                >Köszönjük, hogy regisztráltál a Foodnet rendszerébe. Igérjük, hogy izgalmas meglepetésekben...</span
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
                          width="100%"
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
                                  <h1>Stimate ${orderedUserName}!</h1>
                                   
                                  <p>
                                  Restaurantul ${restaurantName} a acceptar comanda dvs. cu numărul: ${orderId}. Meniul comandat va fi livrat aproximativ în ${minutes} minute. Pentru alte informații sunați la nr. telefon al restaurantului: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>.
                                  </p>
                                 
                                 
                                  <p>Poftă bună! - echipa Foodnet.</p>
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
                                  <br />Principală 820 <br />Postakód 537130
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
        };
        // await sendSms();
        // await mg.messages().send(data, function (error, body) {
        //   if (error) {
        //     console.log(error);
        //   }
        // });
      }
    }

    if (failedDescription.length !== 0) {
      await Order.update(
        { orderStatusId: 3, deletedMessage: failedDescription },
        { where: { encodedKey: orderId } }
      );
      if (orderedLang == "hu") {
        var jsonDataObj = {
          to: orderedUserPhoneNumber,
          sender: "4",
          body: `Kedves ${orderedUserName}! A(z) ${restaurantName} elutasította a rendelésed, melynek rendelési száma: ${orderId}. Az elutasítás oka a következő: ${failedDescription}. További információkért az étterem telefonszámán érdeklődhetsz: ${restaurantPhone}.`,
        };
        const data = {
          from: "info@foodnet.ro",
          to: orderedUserEmail,
          subject: "Kiszállítási idő",
          html: `
             
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
                  background-color: #f4f4f7;
                  color: #51545e;
                }
          
                p {
                  color: #51545e;
                }
          
                p.sub {
                  color: #6b6e76;
                }
          
                .email-wrapper {
                  width: 100%;
                  margin: 0;
                  padding: 0;
                  -premailer-width: 100%;
                  -premailer-cellpadding: 0;
                  -premailer-cellspacing: 0;
                  background-color: #f4f4f7;
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
                  background-color: #ffffff;
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
                  color: #6b6e76;
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
                  padding: 35px;
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
                >Köszönjük, hogy regisztráltál a Foodnet rendszerébe. Igérjük, hogy izgalmas meglepetésekben...</span
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
                          width="100%"
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
                                  <h1>Kedves ${orderedUserName}!</h1>
                                
                                  <p>
                                  A(z) ${restaurantName} elutasította a rendelésed, melynek rendelési száma: ${orderId}. Az elutasítás oka a következő: ${failedDescription}. További információkért az étterem telefonszámán érdeklődhetsz: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>.
                                  </p>
                                 
                                 
                                  
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
                                  <br />Principală 820 <br />Postakód 537130
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
        };
        // async function sendSms() {
        //   request.post({
        //     headers: {
        //       "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
        //     },
        //     url: "https://app.smso.ro/api/v1/send",
        //     body: jsonDataObj,
        //     json: true,
        //   });
        // }
        // await mg.messages().send(data, function (error, body) {
        //   if (error) {
        //     console.log(error);
        //   }
        // });
        // await sendSms();
      } else {
        var jsonDataObj = {
          to: orderedUserPhoneNumber,
          sender: "4",
          body: `Stimate ${orderedUserName}! Restaurantul ${restaurantName} a refuzat comanda dvs. cu numărul: ${orderId}. Pe motiv de: ${failedDescription}. Pentru alte informații sunați la nr. telefon al restaurantului: ${restaurantPhone}.`,
        };
        const data = {
          from: "info@foodnet.ro",
          to: orderedUserEmail,
          subject: "Kiszállítási idő",
          html: `
             
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
                  background-color: #f4f4f7;
                  color: #51545e;
                }
          
                p {
                  color: #51545e;
                }
          
                p.sub {
                  color: #6b6e76;
                }
          
                .email-wrapper {
                  width: 100%;
                  margin: 0;
                  padding: 0;
                  -premailer-width: 100%;
                  -premailer-cellpadding: 0;
                  -premailer-cellspacing: 0;
                  background-color: #f4f4f7;
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
                  background-color: #ffffff;
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
                  color: #6b6e76;
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
                  padding: 35px;
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
                >Köszönjük, hogy regisztráltál a Foodnet rendszerébe. Igérjük, hogy izgalmas meglepetésekben...</span
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
                          width="100%"
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
                                  <h1>Stimate ${orderedUserName}!</h1>
                                   
                                  <p>
                                  Restaurantul ${restaurantName} a refuzat comanda dvs. cu numărul: ${orderId}. Pe motiv de: ${failedDescription}. Pentru alte informații sunați la nr. telefon al restaurantului: <a href="tel:${restaurantPhone}">${restaurantPhone}</a>.
                                  </p>
 
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
                                  <br />Principală 820 <br />Postakód 537130
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
        };
        // async function sendSms() {
        //   request.post({
        //     headers: {
        //       "X-Authorization": "j1HPv95lUhKKF2JJv66zeuGn7sSNFP6bPeWrSv89",
        //     },
        //     url: "https://app.smso.ro/api/v1/send",
        //     body: jsonDataObj,
        //     json: true,
        //   });
        // }
        // await mg.messages().send(data, function (error, body) {
        //   if (error) {
        //     console.log(error);
        //   }
        // });
        // await sendSms();
      }
    }
    return res.json({
      status: 200,
      msg: "Operation successful",
      result: [],
    });
  } catch (error) {
    return res.json({
      status: 500,
      msg: "Server error",
      result: [],
    });
  }
});

///
router.get("/:lang/order-list/accepted/:id", auth, async (req, res) => {
  let languageCode;
  let orderList = [];
  if (req.params.lang == "ro") {
    languageCode = 1;
  } else {
    languageCode = 2;
  }

  const orders = await Order.findAll({
    where: {
      restaurantId: req.admin.id,
      encodedKey: req.params.id,
    },
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
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { model: OrderDeliveryAddress },
      { model: User },
      { model: Restaurant },
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

  let deliveryPriceCity;
  let extras = [];
  let total;
  let cutlery;
  let take;
  let userName;
  let orderStreet;
  let orderHouseNumber;
  let orderFloor;
  let orderDoorNumber;
  let orderPhoneNumber;
  let orderCreated;
  let orderId;
  let deliveredPrice;
  let location;
  let locationId;
  let messageCourier;
  let deliveryPriceVillage;

  for (let i = 0; i < orders.length; i++) {
    const resultWithAll = [];
    let orderItems = orders[i].OrderItems;

    for (let j = 0; j < orderItems.length; j++) {
      extras = orderItems[j].OrderItemExtras;

      let prodFin = orderItems[j].Variant.ProductFinals;
      for (let h = 0; h < prodFin.length; h++) {
        if (extras.length == 0) {
          let totalProductPrice = 0;
          let totalBoxPrice = 0;
          totalProductPrice +=
            parseFloat(orderItems[j].variantPrice) *
            parseInt(orderItems[j].quantity);
          totalBoxPrice +=
            parseFloat(orderItems[j].boxPrice) *
            parseInt(orderItems[j].quantity);
          const items = {
            orderItemId: orderItems[j].id,
            boxPrice: orderItems[j].boxPrice,
            totalBoxPrice: totalBoxPrice.toFixed(2),
            variant_sku: orderItems[j].Variant.sku,
            extra_length: extras.length,
            product_id: prodFin[h].productId,
            product_quantity: orderItems[j].quantity,
            message: orderItems[j].message,
            product_price: orderItems[j].variantPrice,
            product_name: prodFin[h].Product.ProductTranslations[0].title,
            total_product_price: totalProductPrice,
          };

          resultWithAll.push(items);
        } else {
          for (let k = 0; k < extras.length; k++) {
            let totalExtraPrice = 0;
            let totalProductPrice = 0;
            let totalBoxPrice = 0;
            let totalSection = 0;
            let totalSectionNoBox = 0;
            let extraPlusProduct = 0;
            totalExtraPrice +=
              parseFloat(extras[k].extraPrice) * parseInt(extras[k].quantity);
            // console.log("totalExtraPrice");

            totalProductPrice +=
              parseFloat(orderItems[j].variantPrice) *
              parseInt(orderItems[j].quantity);

            totalBoxPrice +=
              parseFloat(orderItems[j].boxPrice) *
              parseInt(orderItems[j].quantity);

            totalSection +=
              parseFloat(totalBoxPrice) +
              parseFloat(totalExtraPrice) +
              parseFloat(totalProductPrice);

            totalSectionNoBox +=
              parseFloat(totalExtraPrice) + parseFloat(totalProductPrice);

            const items = {
              orderItemId: orderItems[j].id,
              variant_sku: orderItems[j].Variant.sku,
              totalBoxPrice: totalBoxPrice.toFixed(2),
              boxPrice: orderItems[j].boxPrice,
              totalSection: totalSection,
              totalSectionNoBox: totalSectionNoBox,
              extra_length: extras.length,
              product_id: prodFin[h].productId,
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
            };

            resultWithAll.push(items);
          }
        }
      }
    }

    deliveryPriceVillage = orders[0].Restaurant.deliveryPriceVillage;
    deliveryPriceCity = orders[0].Restaurant.deliveryPriceCity;
    locationId = orders[0].locationId;
    const checkLocId = await LocationName.findByPk(locationId);

    if (checkLocId == 1) {
      deliveredPrice = deliveryPriceVillage;
    } else {
      deliveredPrice = deliveryPriceCity;
    }

    const reduced = resultWithAll.reduce((acc, val) => {
      const {
        extra_id,
        extra_quantity,
        extra_price,
        extra_name,
        ...otherFields
      } = val;

      const existing = acc.find((item) => item.orderItemId === val.orderItemId);
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

    orders[i].products = reduced;
    orderList = reduced;

    cutlery = orders[0].cutlery;
    take = orders[0].take;
    orderStreet = orders[0].OrderDeliveryAddress.street;
    orderHouseNumber = orders[0].OrderDeliveryAddress.houseNumber;
    orderFloor = orders[0].OrderDeliveryAddress.floor;
    orderDoorNumber = orders[0].OrderDeliveryAddress.doorNumber;
    orderPhoneNumber = orders[0].OrderDeliveryAddress.phoneNumber;
    orderCreated = orders[0].createdAt.toLocaleString("en-GB", {
      timeZone: "Europe/Helsinki",
    });
    total = orders[0].totalPrice;
    userName = orders[0].OrderDeliveryAddress.userName;
    orderId = orders[0].encodedKey;
    location = orders[0].LocationName.LocationNameTranslations[0].name;
    messageCourier = orders[0].messageCourier;
  }

  res.json({
    status: 200,
    msg: "Success",
    result: orderList,
    cutlery,
    take,
    orderStreet,
    orderHouseNumber,
    orderFloor,
    orderDoorNumber,
    orderPhoneNumber,
    orderCreated,
    userName,
    orderId,
    total,
    location,
    messageCourier,
    deliveredPrice,
  });
});
router.get("/:lang/order-list/rejected/:id", auth, async (req, res) => {
  let languageCode;
  let orderList = [];
  if (req.params.lang == "ro") {
    languageCode = 1;
  } else {
    languageCode = 2;
  }

  const orders = await Order.findAll({
    where: {
      restaurantId: req.admin.id,
      encodedKey: req.params.id,
    },
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
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { model: OrderDeliveryAddress },
      { model: User },
      { model: Restaurant },
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

  let deliveryPriceCity;
  let extras = [];
  let total;
  let cutlery;
  let take;
  let userName;
  let orderStreet;
  let orderHouseNumber;
  let orderFloor;
  let orderDoorNumber;
  let orderPhoneNumber;
  let orderCreated;
  let orderId;
  let deliveredPrice;
  let location;
  let locationId;
  let messageCourier;
  let deliveryPriceVillage;

  for (let i = 0; i < orders.length; i++) {
    const resultWithAll = [];
    let orderItems = orders[i].OrderItems;

    for (let j = 0; j < orderItems.length; j++) {
      extras = orderItems[j].OrderItemExtras;

      let prodFin = orderItems[j].Variant.ProductFinals;
      for (let h = 0; h < prodFin.length; h++) {
        if (extras.length == 0) {
          let totalProductPrice = 0;
          let totalBoxPrice = 0;
          totalProductPrice +=
            parseFloat(orderItems[j].variantPrice) *
            parseInt(orderItems[j].quantity);
          totalBoxPrice +=
            parseFloat(orderItems[j].boxPrice) *
            parseInt(orderItems[j].quantity);
          const items = {
            orderItemId: orderItems[j].id,
            boxPrice: orderItems[j].boxPrice,
            totalBoxPrice: totalBoxPrice.toFixed(2),
            variant_sku: orderItems[j].Variant.sku,
            extra_length: extras.length,
            product_id: prodFin[h].productId,
            product_quantity: orderItems[j].quantity,
            message: orderItems[j].message,
            product_price: orderItems[j].variantPrice,
            product_name: prodFin[h].Product.ProductTranslations[0].title,
            total_product_price: totalProductPrice,
          };

          resultWithAll.push(items);
        } else {
          for (let k = 0; k < extras.length; k++) {
            let totalExtraPrice = 0;
            let totalProductPrice = 0;
            let totalBoxPrice = 0;
            let totalSection = 0;
            let totalSectionNoBox = 0;
            let extraPlusProduct = 0;
            totalExtraPrice +=
              parseFloat(extras[k].extraPrice) * parseInt(extras[k].quantity);
            // console.log("totalExtraPrice");

            totalProductPrice +=
              parseFloat(orderItems[j].variantPrice) *
              parseInt(orderItems[j].quantity);

            totalBoxPrice +=
              parseFloat(orderItems[j].boxPrice) *
              parseInt(orderItems[j].quantity);

            totalSection +=
              parseFloat(totalBoxPrice) +
              parseFloat(totalExtraPrice) +
              parseFloat(totalProductPrice);

            totalSectionNoBox +=
              parseFloat(totalExtraPrice) + parseFloat(totalProductPrice);

            const items = {
              orderItemId: orderItems[j].id,
              variant_sku: orderItems[j].Variant.sku,
              totalBoxPrice: totalBoxPrice.toFixed(2),
              boxPrice: orderItems[j].boxPrice,
              totalSection: totalSection,
              totalSectionNoBox: totalSectionNoBox,
              extra_length: extras.length,
              product_id: prodFin[h].productId,
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
            };

            resultWithAll.push(items);
          }
        }
      }
    }

    deliveryPriceVillage = orders[0].Restaurant.deliveryPriceVillage;
    deliveryPriceCity = orders[0].Restaurant.deliveryPriceCity;
    locationId = orders[0].locationId;
    const checkLocId = await LocationName.findByPk(locationId);

    if (checkLocId == 1) {
      deliveredPrice = deliveryPriceVillage;
    } else {
      deliveredPrice = deliveryPriceCity;
    }

    const reduced = resultWithAll.reduce((acc, val) => {
      const {
        extra_id,
        extra_quantity,
        extra_price,
        extra_name,
        ...otherFields
      } = val;

      const existing = acc.find((item) => item.orderItemId === val.orderItemId);
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

    orders[i].products = reduced;
    orderList = reduced;

    cutlery = orders[0].cutlery;
    take = orders[0].take;
    orderStreet = orders[0].OrderDeliveryAddress.street;
    orderHouseNumber = orders[0].OrderDeliveryAddress.houseNumber;
    orderFloor = orders[0].OrderDeliveryAddress.floor;
    orderDoorNumber = orders[0].OrderDeliveryAddress.doorNumber;
    orderPhoneNumber = orders[0].OrderDeliveryAddress.phoneNumber;
    orderCreated = orders[0].createdAt.toLocaleString("en-GB", {
      timeZone: "Europe/Helsinki",
    });
    total = orders[0].totalPrice;
    userName = orders[0].OrderDeliveryAddress.userName;
    orderId = orders[0].encodedKey;
    location = orders[0].LocationName.LocationNameTranslations[0].name;
    messageCourier = orders[0].messageCourier;
  }

  res.json({
    status: 200,
    msg: "Success",
    result: orderList,
    cutlery,
    take,
    orderStreet,
    orderHouseNumber,
    orderFloor,
    orderDoorNumber,
    orderPhoneNumber,
    orderCreated,
    userName,
    orderId,
    total,
    location,
    messageCourier,
    deliveredPrice,
  });
});
module.exports = router;
