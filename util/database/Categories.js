const Language = require("../../models/Language");
const Restaurant = require("../../models/Restaurant");
const Category = require("../../models/Category");
const CategoryTranslation = require("../../models/CategoryTranslation");
const Variant = require("../../models/Variant");

function categories() {
  Category.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(Category, { foreignKey: "restaurantId" });

  CategoryTranslation.belongsTo(Category, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "categoryId",
  });

  Category.hasMany(CategoryTranslation, { foreignKey: "categoryId" });

  CategoryTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });

  Language.hasMany(CategoryTranslation, { foreignKey: "languageId" });

  Variant.belongsTo(Category, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "categoryId",
  });

  Category.hasMany(Variant, { foreignKey: "categoryId" });
}

module.exports = { categories };
