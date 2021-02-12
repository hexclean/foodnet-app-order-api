const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const ProductTranslation = sequelize.define("ProductTranslation", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
  },
  description: {
    type: Sequelize.STRING,
  },
});

module.exports = ProductTranslation;
