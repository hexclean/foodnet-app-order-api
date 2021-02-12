const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const UserDeliveryAddress = sequelize.define("UserDeliveryAddress", {
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
});

module.exports = UserDeliveryAddress;
