var DataTypes = require("sequelize").DataTypes;
var _SequelizeMeta = require("./SequelizeMeta");
var _companies = require("./companies");
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
var _store_images = require("./store_images");
var _store_types = require("./store_types");
var _stores = require("./stores");
var _supplier_companies = require("./supplier_companies");
var _supplier_verifications = require("./supplier_verifications");
var _supplies_stock = require("./supplies_stock");
var _inventory_supplies_balance = require("./inventory_supplies_balance"); // 📌 Agregado
var _user_current_position = require("./user_current_position");
var _users = require("./users");
var _work_areas = require("./work_areas");

function initModels(sequelize) {
  var SequelizeMeta = _SequelizeMeta(sequelize, DataTypes);
  var companies = _companies(sequelize, DataTypes);
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
  var store_images = _store_images(sequelize, DataTypes);
  var store_types = _store_types(sequelize, DataTypes);
  var stores = _stores(sequelize, DataTypes);
  var supplier_companies = _supplier_companies(sequelize, DataTypes);
  var supplier_verifications = _supplier_verifications(sequelize, DataTypes);
  var supplies_stock = _supplies_stock(sequelize, DataTypes);
  var inventory_supplies_balance = _inventory_supplies_balance(sequelize, DataTypes); // 📌 Agregado
  var user_current_position = _user_current_position(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var work_areas = _work_areas(sequelize, DataTypes);

  // ✅ Relación entre inventory_supplies y supplies_stock
  supplies_stock.belongsTo(inventory_supplies, { as: "inventory_supply", foreignKey: "inventory_supply_id" });
  inventory_supplies.hasMany(supplies_stock, { as: "supplies_stock", foreignKey: "inventory_supply_id" });

  // ✅ Relación entre inventory_supplies y inventory_supplies_balance
  inventory_supplies_balance.belongsTo(inventory_supplies, { as: "inventory_supply", foreignKey: "inventory_supply_id" });
  inventory_supplies.hasOne(inventory_supplies_balance, { as: "balance", foreignKey: "inventory_supply_id" });

  // ✅ Relación entre recipe_items y inventory_supplies
  recipe_items.belongsTo(inventory_supplies, { as: "inventory_supply", foreignKey: "inventory_supply_id" });
  inventory_supplies.hasMany(recipe_items, { as: "recipe_items", foreignKey: "inventory_supply_id" });

  sales.belongsTo(payment_methods, { as: "payment_method", foreignKey: "payment_method_id" });
  payment_methods.hasMany(sales, { as: "sales", foreignKey: "payment_method_id" });

  recipes.belongsTo(products, { as: "product", foreignKey: "product_id" });
  products.hasMany(recipes, { as: "recipes", foreignKey: "product_id" });

  sale_items.belongsTo(products, { as: "product", foreignKey: "product_id" });
  products.hasMany(sale_items, { as: "sale_items", foreignKey: "product_id" });

  recipe_items.belongsTo(recipes, { as: "recipe", foreignKey: "recipe_id" });
  recipes.hasMany(recipe_items, { as: "recipe_items", foreignKey: "recipe_id" });

  users.belongsTo(roles, { as: "role", foreignKey: "role_id" });
  roles.hasMany(users, { as: "users", foreignKey: "role_id" });

  stores.belongsTo(routes, { as: "route", foreignKey: "route_id" });
  routes.hasMany(stores, { as: "stores", foreignKey: "route_id" });

  sale_items.belongsTo(sales, { as: "sale", foreignKey: "sale_id" });
  sales.hasMany(sale_items, { as: "sale_items", foreignKey: "sale_id" });

  stores.belongsTo(store_types, { as: "store_type", foreignKey: "store_type_id" });
  store_types.hasMany(stores, { as: "stores", foreignKey: "store_type_id" });

  stores.hasMany(store_images, { as: "images", foreignKey: "store_id" });
  store_images.belongsTo(stores, { as: "store", foreignKey: "store_id" });

  store_images.belongsTo(users, { as: "uploader", foreignKey: "uploaded_by" });
  users.hasMany(store_images, { as: "uploaded_images", foreignKey: "uploaded_by" });

  sales.belongsTo(stores, { as: "store", foreignKey: "store_id" });
  stores.hasMany(sales, { as: "sales", foreignKey: "store_id" });

  sales.belongsTo(users, { as: "user", foreignKey: "user_id" });
  users.hasMany(sales, { as: "sales", foreignKey: "user_id" });

  stores.belongsTo(users, { as: "manager", foreignKey: "manager_id" });
  users.hasMany(stores, { as: "stores", foreignKey: "manager_id" });

  products.belongsTo(work_areas, { as: "production_area", foreignKey: "production_area_id" });
  work_areas.hasMany(products, { as: "products", foreignKey: "production_area_id" });

  // ✅ Relaciones para supplier_verifications
  supplier_verifications.belongsTo(supplier_companies, { as: "supplier", foreignKey: "supplier_id", onDelete: "CASCADE" });
  supplier_companies.hasMany(supplier_verifications, { as: "verifications", foreignKey: "supplier_id", onDelete: "CASCADE" });

  supplier_verifications.belongsTo(users, { as: "verifying_user", foreignKey: "user_id" });
  users.hasMany(supplier_verifications, { as: "supplier_verifications", foreignKey: "user_id" });

  supplier_verifications.belongsTo(companies, { as: "verifying_company", foreignKey: "company_id" });
  companies.hasMany(supplier_verifications, { as: "supplier_verifications", foreignKey: "company_id" });

  // ✅ Relaciones para user_current_position
  user_current_position.belongsTo(users, { as: "user", foreignKey: "user_id", onDelete: "CASCADE" });
  users.hasOne(user_current_position, { as: "current_position", foreignKey: "user_id", onDelete: "CASCADE" });

  return {
    SequelizeMeta,
    companies,
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
    store_images,
    store_types,
    stores,
    supplier_companies,
    supplier_verifications,
    supplies_stock,
    inventory_supplies_balance,
    user_current_position,
    users,
    work_areas,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;


