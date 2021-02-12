const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Variant = sequelize.define("Variant", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  sku: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  maxOption: Sequelize.INTEGER,
});

module.exports = Variant;
