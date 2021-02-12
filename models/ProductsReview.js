const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const ProductsReview = sequelize.define("ProductsReview", {
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
});

module.exports = ProductsReview;
