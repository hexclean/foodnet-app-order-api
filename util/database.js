const Sequelize = require("sequelize");
const db = {};

sequelize = new Sequelize("defaultdb", "doadmin", "s27c8agot7l7a13z", {
  dialect: "mysql",
  host: "foodnet-database-do-user-8133521-0.b.db.ondigitalocean.com",
  port: 25060,
});

// const sequelize = new Sequelize("foodnetfin", "root", "", {
//   dialect: "mysql",
//   host: "localhost",
// });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = sequelize;
