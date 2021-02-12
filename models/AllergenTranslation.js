const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const AllergenTranslation = sequelize.define("AllergenTranslation", {
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

module.exports = AllergenTranslation;
