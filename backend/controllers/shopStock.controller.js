/**
 * Shop Stock Controller
 * View and update monthly stock levels per shop.
 */
const { success, created } = require('../utils/response');
const stockService = require('../services/stock.service');

/**
 * GET /api/shop-stock?shop_id=&month=&year=
 */
const getStock = async (req, res, next) => {
    try {
        const shopId = req.user?.role === 'shop_operator' ? req.user.shopId : req.query.shop_id;

        if (!shopId) {
            return res.status(400).json({ success: false, message: 'shop_id is required' });
        }

        const month = req.query.month ? parseInt(req.query.month) : undefined;
        const year = req.query.year ? parseInt(req.query.year) : undefined;

        const stock = await stockService.getShopStock(shopId, month, year);
        return success(res, stock);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/shop-stock
 * Create or update stock allocation for a shop/commodity/period.
 */
const upsertStock = async (req, res, next) => {
    try {
        const { shop_id, commodity_id, month, year, allocated_qty, distributed_qty } = req.body;

        const stock = await stockService.upsertStock({
            shopId: shop_id,
            commodityId: commodity_id,
            month,
            year,
            allocatedQty: allocated_qty,
            distributedQty: distributed_qty,
            userId: req.user.id,
        });

        return created(res, stock, 'Stock updated');
    } catch (err) {
        next(err);
    }
};

module.exports = { getStock, upsertStock };
