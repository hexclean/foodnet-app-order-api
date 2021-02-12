const Restaurant = require("../../models/Restaurant");
const Extra = require("../../models/Extra");
const Order = require("../../models/Order");
const OrderItem = require("../../models/OrderItem");
const OrderItemExtra = require("../../models/OrderItemExtra");
const Variant = require("../../models/Variant");
const LocationName = require("../../models/LocationName");
const User = require("../../models/User");
const OrderDeliveryAddress = require("../../models/OrderDeliveryAddress");
const OrderStatus = require("../../models/OrderStatus");

function orders() {
  Order.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(Order, { foreignKey: "restaurantId" });

  Order.belongsTo(OrderStatus, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "orderStatusId",
  });

  OrderStatus.hasMany(Order, { foreignKey: "orderStatusId" });

  Order.belongsTo(OrderDeliveryAddress, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "orderDeliveryAddressId",
  });

  OrderDeliveryAddress.hasMany(Order, { foreignKey: "orderDeliveryAddressId" });

  OrderItem.belongsTo(Order, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "orderId",
  });
  Order.hasMany(OrderItem, { foreignKey: "orderId" });

  OrderItem.belongsTo(Variant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "variantId",
  });

  Variant.hasMany(OrderItem, { foreignKey: "variantId" });

  OrderItemExtra.belongsTo(Extra, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "extraId",
  });

  Extra.hasMany(OrderItemExtra, { foreignKey: "extraId" });

  OrderItemExtra.belongsTo(OrderItem, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "orderItemId",
  });
  OrderItem.hasMany(OrderItemExtra, { foreignKey: "orderItemId" });

  Order.belongsTo(User, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "userId",
  });
  User.hasMany(Order, { foreignKey: "userId" });

  Order.belongsTo(LocationName, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "locationNameId",
  });
  LocationName.hasMany(Order, { foreignKey: "locationNameId" });
}

module.exports = { orders };
