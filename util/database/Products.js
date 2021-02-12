const Language = require("../../models/Language");
const Product = require("../../models/Product");
const ProductTranslation = require("../../models/ProductTranslation");
const Variant = require("../../models/Variant");
const ProductFinal = require("../../models/ProductFinal");
const Restaurant = require("../../models/Restaurant");
const Allergen = require("../../models/Allergen");
const ProductHasAllergen = require("../../models/ProductHasAllergen");

function products() {
  Product.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(Product, { foreignKey: "restaurantId" });

  ProductTranslation.belongsTo(Product, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "productId",
  });
  Product.hasMany(ProductTranslation, { foreignKey: "productId" });

  ProductTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });

  Language.hasMany(ProductTranslation, { foreignKey: "languageId" });

  ProductFinal.belongsTo(Product, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "productId",
  });

  Product.hasMany(ProductFinal, { foreignKey: "productId" });

  ProductHasAllergen.belongsTo(Product, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "productId",
  });

  Product.hasMany(ProductHasAllergen, { foreignKey: "productId" });

  ProductHasAllergen.belongsTo(Allergen, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "allergenId",
  });

  Allergen.hasMany(ProductHasAllergen, { foreignKey: "allergenId" });

  ProductFinal.belongsTo(Variant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "variantId",
  });

  Variant.hasMany(ProductFinal, { foreignKey: "variantId" });
}

module.exports = { products };
