const RestaurantsReviews = require("../../models/RestaurantsReviews");
const User = require("../../models/User");
const UserDeliveryAddress = require("../../models/UserDeliveryAddress");
const UserProfile = require("../../models/UserProfile");
const ResetPasswordApp = require("../../models/ResetPasswordApp");
const LocationName = require("../../models/LocationName");
const OrderDeliveryAddress = require("../../models/OrderDeliveryAddress");

function users() {
  UserDeliveryAddress.belongsTo(User, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "userId",
  });
  User.hasMany(UserDeliveryAddress, { foreignKey: "userId" });

  OrderDeliveryAddress.belongsTo(User, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "userId",
  });
  User.hasMany(OrderDeliveryAddress, { foreignKey: "userId" });

  ResetPasswordApp.belongsTo(User, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "userId",
  });
  User.hasMany(ResetPasswordApp, { foreignKey: "userId" });

  RestaurantsReviews.belongsTo(User, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "userId",
  });
  User.hasMany(RestaurantsReviews, { foreignKey: "userId" });

  UserProfile.belongsTo(User, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "userId",
  });
  User.hasMany(UserProfile, { foreignKey: "userId" });

  UserDeliveryAddress.belongsTo(LocationName, {
    constrains: true,
    onDelete: "CASCADE",
    foreignKey: "locationNameId",
  });

  LocationName.hasMany(UserDeliveryAddress, {
    foreignKey: "locationNameId",
  });
}

module.exports = { users };
