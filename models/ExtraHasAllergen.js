const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const ExtraHasAllergen = sequelize.define("ExtraHasAllergen", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  active: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = ExtraHasAllergen;
