const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const User = sequelize.define("User", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  fullName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  phoneNumber: {
    type: Sequelize.STRING,
  },
  resetToken: Sequelize.STRING,
  resetLang: Sequelize.STRING,
  resetTokenExpiration: Sequelize.DATE,
  role: Sequelize.INTEGER,
  newsletter: Sequelize.INTEGER,
  code: Sequelize.INTEGER,
  balance: Sequelize.FLOAT,
  mobil: Sequelize.INTEGER,
  web: Sequelize.INTEGER,
});

module.exports = User;
