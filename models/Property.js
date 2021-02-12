const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Property = sequelize.define("Property", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = Property;
