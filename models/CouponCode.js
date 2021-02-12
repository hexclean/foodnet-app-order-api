const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const CouponCode = sequelize.define("CouponCode", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  value: {
    type: Sequelize.FLOAT,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  minOrder: Sequelize.FLOAT,
  timeStart: Sequelize.DATE,
  timeEnd: Sequelize.DATE,
  piece: Sequelize.INTEGER,
});

module.exports = CouponCode;
