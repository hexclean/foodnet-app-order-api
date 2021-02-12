const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Hours = sequelize.define("Hours", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = Hours;
