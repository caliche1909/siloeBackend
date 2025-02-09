var DataTypes = require("sequelize").DataTypes;
var _SequelizeMeta = require("./SequelizeMeta");
var _inventory_supplies = require("./inventory_supplies");
var _measurement_units = require("./measurement_units");
var _payment_methods = require("./payment_methods");
var _products = require("./products");
var _recipe_items = require("./recipe_items");
var _recipes = require("./recipes");
var _roles = require("./roles");
var _routes = require("./routes");
var _sale_items = require("./sale_items");
var _sales = require("./sales");
var _store_types = require("./store_types");
var _stores = require("./stores");
var _supplier_companies = require("./supplier_companies");
var _supplies = require("./supplies");
var _users = require("./users");
var _work_areas = require("./work_areas");

function initModels(sequelize) {
  var SequelizeMeta = _SequelizeMeta(sequelize, DataTypes);
  var inventory_supplies = _inventory_supplies(sequelize, DataTypes);
  var measurement_units = _measurement_units(sequelize, DataTypes);
  var payment_methods = _payment_methods(sequelize, DataTypes);
  var products = _products(sequelize, DataTypes);
  var recipe_items = _recipe_items(sequelize, DataTypes);
  var recipes = _recipes(sequelize, DataTypes);
  var roles = _roles(sequelize, DataTypes);
  var routes = _routes(sequelize, DataTypes);
  var sale_items = _sale_items(sequelize, DataTypes);
  var sales = _sales(sequelize, DataTypes);
  var store_types = _store_types(sequelize, DataTypes);
  var stores = _stores(sequelize, DataTypes);
  var supplier_companies = _supplier_companies(sequelize, DataTypes);
  var supplies = _supplies(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var work_areas = _work_areas(sequelize, DataTypes);

  supplies.belongsTo(measurement_units, { as: "unit", foreignKey: "unit_id"});
  measurement_units.hasMany(supplies, { as: "supplies", foreignKey: "unit_id"});
  sales.belongsTo(payment_methods, { as: "payment_method", foreignKey: "payment_method_id"});
  payment_methods.hasMany(sales, { as: "sales", foreignKey: "payment_method_id"});
  recipes.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(recipes, { as: "recipes", foreignKey: "product_id"});
  sale_items.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(sale_items, { as: "sale_items", foreignKey: "product_id"});
  recipe_items.belongsTo(recipes, { as: "recipe", foreignKey: "recipe_id"});
  recipes.hasMany(recipe_items, { as: "recipe_items", foreignKey: "recipe_id"});
  users.belongsTo(roles, { as: "role", foreignKey: "role_id"});
  roles.hasMany(users, { as: "users", foreignKey: "role_id"});
  stores.belongsTo(routes, { as: "route", foreignKey: "route_id"});
  routes.hasMany(stores, { as: "stores", foreignKey: "route_id"});
  sale_items.belongsTo(sales, { as: "sale", foreignKey: "sale_id"});
  sales.hasMany(sale_items, { as: "sale_items", foreignKey: "sale_id"});
  stores.belongsTo(store_types, { as: "store_type", foreignKey: "store_type_id"});
  store_types.hasMany(stores, { as: "stores", foreignKey: "store_type_id"});
  sales.belongsTo(stores, { as: "store", foreignKey: "store_id"});
  stores.hasMany(sales, { as: "sales", foreignKey: "store_id"});
  supplies.belongsTo(supplier_companies, { as: "supplier", foreignKey: "supplier_id"});
  supplier_companies.hasMany(supplies, { as: "supplies", foreignKey: "supplier_id"});
  inventory_supplies.belongsTo(supplies, { as: "supply", foreignKey: "supply_id"});
  supplies.hasMany(inventory_supplies, { as: "inventory_supplies", foreignKey: "supply_id"});
  recipe_items.belongsTo(supplies, { as: "supply", foreignKey: "supply_id"});
  supplies.hasMany(recipe_items, { as: "recipe_items", foreignKey: "supply_id"});
  sales.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(sales, { as: "sales", foreignKey: "user_id"});
  stores.belongsTo(users, { as: "manager", foreignKey: "manager_id"});
  users.hasMany(stores, { as: "stores", foreignKey: "manager_id"});
  products.belongsTo(work_areas, { as: "production_area", foreignKey: "production_area_id"});
  work_areas.hasMany(products, { as: "products", foreignKey: "production_area_id"});

  return {
    SequelizeMeta,
    inventory_supplies,
    measurement_units,
    payment_methods,
    products,
    recipe_items,
    recipes,
    roles,
    routes,
    sale_items,
    sales,
    store_types,
    stores,
    supplier_companies,
    supplies,
    users,
    work_areas,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
