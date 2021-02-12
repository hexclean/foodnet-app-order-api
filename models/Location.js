const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Location = sequelize.define("Location", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = Location;
