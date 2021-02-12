const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const RestaurantsReviews = sequelize.define("RestaurantsReviews", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  message: Sequelize.STRING,
  time: Sequelize.DATE,
  rating: Sequelize.INTEGER,
  genLink: Sequelize.STRING,
  genLinkExpiration: Sequelize.STRING,
  reviewActive: Sequelize.INTEGER,
});

module.exports = RestaurantsReviews;
