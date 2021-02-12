const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const VariantPropertyValue = sequelize.define("VariantPropertyValue", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = VariantPropertyValue;
