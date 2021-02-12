const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const RestaurantFilters = sequelize.define("RestaurantFilters", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  freeDelivery: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  newest: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  withinOneHour: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  hamburger: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  pizza: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  dailyMenu: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  soup: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },

  salad: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  money: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  card: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = RestaurantFilters;
