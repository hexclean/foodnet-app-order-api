const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const VariantCategory = sequelize.define("VariantCategory", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
  },
});

module.exports = VariantCategory;
