const Language = require("../../models/Language");
const Restaurant = require("../../models/Restaurant");
const RestaurantInfo = require("../../models/RestaurantInfo");
const RestaurantRole = require("../../models/RestaurantRole");
const RestaurantsReviews = require("../../models/RestaurantsReviews");

function restaurants() {
  RestaurantInfo.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(RestaurantInfo, { foreignKey: "restaurantId" });

  RestaurantInfo.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });
  Language.hasMany(RestaurantInfo, { foreignKey: "restaurantId" });

  RestaurantRole.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(RestaurantRole, { foreignKey: "restaurantId" });

  RestaurantsReviews.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(RestaurantsReviews, { foreignKey: "restaurantId" });
}

module.exports = { restaurants };
