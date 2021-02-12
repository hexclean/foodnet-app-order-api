const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const PropertyValueTranslation = sequelize.define("PropertyValueTranslation", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

module.exports = PropertyValueTranslation;
