const Sequelize = require("sequelize");
const db = {};

// sequelize = new Sequelize("defaultdb", "doadmin", "uzg7vmow9hgs0dlw", {
//   dialect: "mysql",
//   host: "staging-db-do-user-8133521-0.b.db.ondigitalocean.com",
//   port: 25060,
// });

sequelize = new Sequelize("defaultdb", "doadmin", "s27c8agot7l7a13z", {
  dialect: "mysql",
  host: "foodnet-database-do-user-8133521-0.b.db.ondigitalocean.com",
  port: 25060,
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = sequelize;
