const Language = require("../../models/Language");
const Restaurant = require("../../models/Restaurant");
const Box = require("../../models/Box");
const ProductFinal = require("../../models/ProductFinal");

function boxes() {
  Box.belongsTo(Restaurant, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "restaurantId",
  });
  Restaurant.hasMany(Box, { foreignKey: "restaurantId" });

  ProductFinal.belongsTo(Box, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "boxId",
  });
  Box.hasMany(ProductFinal, { foreignKey: "boxId" });
}

module.exports = { boxes };
