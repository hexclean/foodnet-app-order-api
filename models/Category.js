const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Category = sequelize.define("Category", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  order: Sequelize.INTEGER,
  active: Sequelize.INTEGER,
});

module.exports = Category;
