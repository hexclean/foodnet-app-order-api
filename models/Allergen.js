const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Allergen = sequelize.define("Allergen", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = Allergen;
