const Sequelize = require("sequelize");
const db = {};

// sequelize = new Sequelize("defaultdb", "doadmin", "uzg7vmow9hgs0dlw", {
//   dialect: "mysql",
//   host: "staging-db-do-user-8133521-0.b.db.ondigitalocean.com",
//   port: 25060,
// });

const sequelize = new Sequelize("foodnetfin", "root", "", {
  dialect: "mysql",
  host: "localhost",
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = sequelize;
