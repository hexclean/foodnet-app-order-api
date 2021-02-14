const Language = require("../../models/Language");
const RestaurantInfo = require("../../models/RestaurantInfo");
const Restaurant = require("../../models/Restaurant");
const RestaurantNoti = require("../../models/RestaurantNoti");
const RestaurantRole = require("../../models/RestaurantRole");
const RestaurantsReviews = require("../../models/RestaurantsReviews");

function restaurants() {
  RestaurantInfo.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(RestaurantInfo, { foreignKey: "restaurantId" });

  //

  RestaurantNoti.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(RestaurantNoti, { foreignKey: "restaurantId" });

  //

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
