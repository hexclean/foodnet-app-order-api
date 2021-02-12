const Restaurant = require("../../models/Restaurant");
const Variant = require("../../models/Variant");
const VariantPropertyValue = require("../../models/VariantPropertyValue");
const PropertyValue = require("../../models/PropertyValue");
const Property = require("../../models/Property");

function variants() {
  Variant.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(Variant, { foreignKey: "restaurantId" });

  VariantPropertyValue.belongsTo(Variant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "variantId",
  });
  Variant.hasMany(VariantPropertyValue, { foreignKey: "variantId" });

  VariantPropertyValue.belongsTo(PropertyValue, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "propertyValueId",
  });
  PropertyValue.hasMany(VariantPropertyValue, {
    foreignKey: "propertyValueId",
  });

  VariantPropertyValue.belongsTo(Property, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "propertyId",
  });
  Property.hasMany(VariantPropertyValue, {
    foreignKey: "propertyId",
  });
}

module.exports = { variants };
