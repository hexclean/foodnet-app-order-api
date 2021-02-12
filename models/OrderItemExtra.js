const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const OrderItemExtra = sequelize.define("OrderItemExtra", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  quantity: {
    type: Sequelize.INTEGER,
  },
  extraPrice: Sequelize.FLOAT,
});

module.exports = OrderItemExtra;
