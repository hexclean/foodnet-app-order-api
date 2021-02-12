const Property = require("../../models/Property");
const PropertyTranslation = require("../../models/PropertyTranslation");
const Restaurant = require("../../models/Restaurant");
const PropertyValue = require("../../models/PropertyValue");
const PropertyValueTranslation = require("../../models/PropertyValueTranslation");
const CategoryProperty = require("../../models/CategoryProperty");
const Category = require("../../models/Category");
const Language = require("../../models/Language");

function property() {
  Property.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(Property, { foreignKey: "restaurantId" });

  PropertyTranslation.belongsTo(Property, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "propertyId",
  });

  Property.hasMany(PropertyTranslation, { foreignKey: "propertyId" });

  PropertyTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });

  Language.hasMany(PropertyTranslation, { foreignKey: "languageId" });
  PropertyValue.belongsTo(Property, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "propertyId",
  });

  Property.hasMany(PropertyValue, { foreignKey: "propertyId" });

  PropertyValue.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(PropertyValue, { foreignKey: "restaurantId" });

  PropertyValueTranslation.belongsTo(PropertyValue, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "propertyValueId",
  });

  PropertyValue.hasMany(PropertyValueTranslation, {
    foreignKey: "propertyValueId",
  });

  PropertyValueTranslation.belongsTo(Language, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "languageId",
  });

  Language.hasMany(PropertyValueTranslation, { foreignKey: "languageId" });

  CategoryProperty.belongsTo(Category, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "categoryId",
  });

  Category.hasMany(CategoryProperty, { foreignKey: "categoryId" });

  CategoryProperty.belongsTo(Property, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "propertyId",
  });

  Property.hasMany(CategoryProperty, { foreignKey: "propertyId" });

  CategoryProperty.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });

  Restaurant.hasMany(CategoryProperty, { foreignKey: "restaurantId" });
}

module.exports = { property };
