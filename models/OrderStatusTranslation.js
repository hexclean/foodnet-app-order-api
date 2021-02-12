const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const OrderStatusTranslation = sequelize.define("OrderStatusTranslation", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: Sequelize.STRING,
});

module.exports = OrderStatusTranslation;
