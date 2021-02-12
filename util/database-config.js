const { openingHours } = require("./database/OpeningHours");
const { products } = require("./database/Products");
const { categories } = require("./database/Categories");
const { extras } = require("./database/Extras");
const { boxes } = require("./database/Boxes");
const { locations } = require("./database/Locations");
const { allergens } = require("./database/Allergens");
const { orders } = require("./database/Orders");
const { variants } = require("./database/Variants");
const { restaurants } = require("./database/Restaurants");
const { users } = require("./database/Users");
const { property } = require("./database/Property");
const { orderStatus } = require("./database/OrderStatus");

function databaseConfig() {
  restaurants();
  products();
  allergens();
  variants();
  categories();
  extras();
  boxes();
  openingHours();
  locations();
  orders();
  users();
  property();
  orderStatus();
}

module.exports = { databaseConfig };
