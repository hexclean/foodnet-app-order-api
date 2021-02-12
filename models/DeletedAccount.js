const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const DeletedAccount = sequelize.define("DeletedAccount", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = DeletedAccount;
