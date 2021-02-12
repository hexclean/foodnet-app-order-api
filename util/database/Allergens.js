const Language = require("../../models/Language");
const Restaurant = require("../../models/Restaurant");
const Allergen = require("../../models/Allergen");
const AllergenTranslation = require("../../models/AllergenTranslation");

function allergens() {
  Allergen.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(Allergen, { foreignKey: "restaurantId" });

  AllergenTranslation.belongsTo(Allergen, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "allergenId",
  });

  Allergen.hasMany(AllergenTranslation, { foreignKey: "allergenId" });

  AllergenTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });

  Language.hasMany(AllergenTranslation, { foreignKey: "languageId" });
}

module.exports = { allergens };
