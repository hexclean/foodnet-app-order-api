const Language = require("../../models/Language");
const Restaurant = require("../../models/Restaurant");
const Hours = require("../../models/Hours");
const OpeningHours = require("../../models/OpeningHours");
const OpeningHoursTranslation = require("../../models/OpeningHoursTranslation");

function openingHours() {
  Hours.belongsTo(OpeningHours, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "openingHoursId",
  });

  OpeningHours.hasMany(Hours, { foreignKey: "openingHoursId" });

  Hours.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(Hours, { foreignKey: "restaurantId" });

  OpeningHours.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(OpeningHours, { foreignKey: "restaurantId" });

  OpeningHoursTranslation.belongsTo(OpeningHours, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "openingHoursId",
  });

  OpeningHours.hasMany(OpeningHoursTranslation, {
    foreignKey: "openingHoursId",
  });

  OpeningHoursTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });
  Language.hasMany(OpeningHoursTranslation, { foreignKey: "languageId" });
}

module.exports = { openingHours };
