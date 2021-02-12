const Language = require("../../models/Language");
const OrderStatus = require("../../models/OrderStatus");
const OrderStatusTranslation = require("../../models/OrderStatusTranslation");

function orderStatus() {
  OrderStatusTranslation.belongsTo(OrderStatus, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "orderStatusId",
  });
  OrderStatus.hasMany(OrderStatusTranslation, { foreignKey: "orderStatusId" });

  OrderStatusTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });
  Language.hasMany(OrderStatusTranslation, { foreignKey: "languageId" });
}

module.exports = { orderStatus };
