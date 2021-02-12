const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const OrderDeliveryAddress = sequelize.define("OrderDeliveryAddress", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  street: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  houseNumber: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  floor: Sequelize.STRING,
  doorNumber: Sequelize.STRING,
  phoneNumber: Sequelize.STRING,
  userName: Sequelize.STRING,
  email: Sequelize.STRING,
});

module.exports = OrderDeliveryAddress;
