const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const RestaurantNoti = sequelize.define("RestaurantNoti", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },

  deviceToken: Sequelize.STRING,
});

module.exports = RestaurantNoti;
