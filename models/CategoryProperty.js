const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const CategoryProperty = sequelize.define("CategoryProperty", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  active: Sequelize.INTEGER,
});

module.exports = CategoryProperty;
