const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const RestaurantRole = sequelize.define("RestaurantRole", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  active: Sequelize.INTEGER,
  role: Sequelize.INTEGER,
});

module.exports = RestaurantRole;
