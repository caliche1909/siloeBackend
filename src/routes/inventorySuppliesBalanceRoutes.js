const express = require('express');
const {inventory_supplies_balanceController} = require('../controllers');
const {verifyToken, checkPermission} = require('../middlewares/jwt.middleware');

const router = express.Router();

// api/balance_inventory_supplies/

// 📌 Ruta para obtener balances por compañía
router.get('/list/:company_id', 
    verifyToken, 
    checkPermission('view-supplies-stock'), // permiso en la base de datos para ver los balances de inventario de insumos
    inventory_supplies_balanceController.getListInventorySuppliesBalance
);

module.exports = router;