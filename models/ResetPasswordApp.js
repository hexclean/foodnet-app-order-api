const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const ResetPasswordApp = sequelize.define("ResetPasswordApp", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  code: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  expiration: {
    type: Sequelize.DATE,
    allowNull: false,
  },
});

module.exports = ResetPasswordApp;
