const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const AdminLogs = sequelize.define("AdminLogs", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  restaurant_id: Sequelize.INTEGER,
  operation_type: Sequelize.STRING, //get, post
  description: Sequelize.STRING, // mit pl. termek, allergen
  route: Sequelize.STRING, // melyik oldal
});

module.exports = AdminLogs;
