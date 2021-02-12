const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const OpeningHours = sequelize.define("OpeningHours", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  open: Sequelize.STRING,
  close: Sequelize.STRING,
  sku: Sequelize.STRING,
});

module.exports = OpeningHours;
