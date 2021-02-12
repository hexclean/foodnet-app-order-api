const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Product = sequelize.define("Product", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  productImagePath: Sequelize.STRING,
  active: {
    type: Sequelize.INTEGER,
  },
  isDailyMenu: Sequelize.INTEGER,
  soldOut: Sequelize.INTEGER,
  startTime: Sequelize.STRING,
  endTime: Sequelize.STRING,
  time: Sequelize.DATE,
});

module.exports = Product;
