const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const ProductVariantToProduct = sequelize.define("ProductVariantToProduct", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  price: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  active: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

module.exports = ProductVariantToProduct;
