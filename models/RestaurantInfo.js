const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const RestaurantInfo = sequelize.define("RestaurantInfo", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  address: {
    type: Sequelize.STRING,
  },
  shortCompanyDesc: Sequelize.STRING,
});

module.exports = RestaurantInfo;
