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
const api_key = "7003ff515d7bf9a71de74c7a64d7562c-c50a0e68-93ac4f33";
const mg = mailgun({
  apiKey: api_key,
  domain: DOMAIN,
  host: "api.eu.mailgun.net",
});

// var ema = require("../test.ejs");
// @route    POST api/orders
// @desc     Create an order
// @access   Private

router.get("/:lang", auth, async (req, res) => {
  let languageCode;
  let orderList = [];
  if (req.params.lang == "ro") {
    languageCode = 1;
  } else {
    languageCode = 2;
  }

  const orders = await Order.findAll({
    order: [["createdAt", "DESC"]],
    where: { orderStatusId: 1, restaurantId: req.admin.id },
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

  if (orders.length != 0) {
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

      const reduced = resultWithAll.reduce((acc, val) => {
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

      orders[i].products = reduced;
      orderList = reduced;
    }
  }
  res.json({
    status: 200,
    msg: "Success",
    result: orderList,
  });
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
