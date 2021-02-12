const Language = require("../../models/Language");
const Restaurant = require("../../models/Restaurant");
const Location = require("../../models/Location");
const LocationName = require("../../models/LocationName");
const LocationNameTranslation = require("../../models/LocationNameTranslation");
const RestaurantFilter = require("../../models/RestaurantFilters");

function locations() {
  Location.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(Location, { foreignKey: "restaurantId" });

  Location.belongsTo(LocationName, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "locationNameId",
  });

  LocationName.hasMany(Location, { foreignKey: "locationNameId" });

  LocationNameTranslation.belongsTo(LocationName, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "locationNameId",
  });
  LocationName.hasMany(LocationNameTranslation, {
    foreignKey: "locationNameId",
  });

  LocationNameTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });

  Language.hasMany(LocationNameTranslation, { foreignKey: "languageId" });

  RestaurantFilter.belongsTo(Location, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "locationId",
  });
  Location.hasMany(RestaurantFilter, {
    foreignKey: "locationId",
  });

  RestaurantFilter.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(RestaurantFilter, {
    foreignKey: "restaurantId",
  });
}

module.exports = { locations };
