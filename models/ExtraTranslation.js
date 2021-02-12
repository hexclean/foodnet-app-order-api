const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const ExtraTranslation = sequelize.define("ExtraTranslation", {
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

module.exports = ExtraTranslation;
