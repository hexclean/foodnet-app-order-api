const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const OrderStatus = sequelize.define("OrderStatus", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = OrderStatus;
