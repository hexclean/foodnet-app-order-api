const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const LocationNameTranslation = sequelize.define("LocationNameTranslation", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: Sequelize.STRING,
});

module.exports = LocationNameTranslation;
