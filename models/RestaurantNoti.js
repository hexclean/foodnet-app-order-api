const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const RestaurantNoti = sequelize.define("RestaurantNoti", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  code: Sequelize.STRING,
  deviceToken: Sequelize.STRING,
});

module.exports = RestaurantNoti;
