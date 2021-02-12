const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Language = sequelize.define("Language", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: Sequelize.STRING,
  languageCode: Sequelize.STRING,
});

module.exports = Language;
