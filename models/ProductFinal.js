const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const ProductFinal = sequelize.define("ProductFinal", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  price: {
    type: Sequelize.FLOAT,
    allowNull: false,
  },
  discountedPrice: Sequelize.FLOAT,

  active: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  review: Sequelize.INTEGER,
});

module.exports = ProductFinal;
