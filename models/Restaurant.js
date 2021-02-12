const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const Restaurant = sequelize.define("Restaurant", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  profileImage: Sequelize.STRING,
  coverImage: Sequelize.STRING,
  commission: Sequelize.FLOAT,
  phoneNumber: Sequelize.STRING,
  email: Sequelize.STRING,
  password: Sequelize.STRING,
  password: Sequelize.STRING,
  fullName: Sequelize.STRING,
  minimumOrderUser: Sequelize.FLOAT,
  minimumOrderSubscriber: Sequelize.FLOAT,
  avgTransport: Sequelize.STRING,
  orderedLang: Sequelize.STRING,
  deliveryPrice: Sequelize.FLOAT,
  newRestaurant: Sequelize.INTEGER,
  discount: Sequelize.INTEGER,
  active: Sequelize.INTEGER,
  rating: Sequelize.INTEGER,
  promotion: Sequelize.INTEGER,
  hasDailyMenu: Sequelize.INTEGER,
  deliveryPriceVillage: Sequelize.FLOAT,
  deliveryPriceCity: Sequelize.FLOAT,
});

module.exports = Restaurant;
