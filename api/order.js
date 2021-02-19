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
const api_key = "3397hjl89804bc04a75f14fe62d0f13c85e08b";
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
    order: [["createdAt", "DESC"]],
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
  let getRestaurantId;
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
        status: 404,
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
    console.log(restaurantDeviceToken);
    // if (restaurantLang == "hu") {
    var message = {
      data: {
        //This is only optional, you can send any data
        score: "850",
        time: "2:45",
      },

      notification: {
        title: "FOODNET EMLÉKEZTETŐ",
        body: "Új rendelésed érkezett",
        // sound: "default",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      token: restaurantDeviceToken,
      // sound: "default",
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

module.exports = router;
