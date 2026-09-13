import { Op } from "sequelize"
import KitchenInventory from "../../../models/kitchenInventory.js"
import Product from "../../../models/product.js"
import { NotFoundError } from "../../../middleware/ErrorHandler.js"
import { assertKitchenOwnership } from "../../../middleware/kitchenAuth.js"

export const getKitchenCatalogService = async (kitchenId, { category, search, page = 1, limit = 20 })=>{
       // Products this kitchen has already imported — excluded from results below.
    const importedRows = await KitchenInventory.findAll({
        where: { kitchenId },
        attributes: ['productId'],
    })
    const importedProductIds = importedRows.map((row) => row.productId)

    const where = { discontinued: false }
    if (importedProductIds.length) {
        where.id = { [Op.notIn]: importedProductIds }
    }
    if (category) {
        where.category = category
    }
    if (search) {
        where.name = { [Op.iLike]: `%${search}%` }
    }
    const offset = (page - 1) * limit
    const { rows, count } = await Product.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: [['name', 'ASC']],
    })
    return {
        products: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit),
        },
    }
}

export const importProductsToKitchenService = async(kitchenId,productIds)=>{
    if (!Array.isArray(productIds) || productIds.length === 0) {
        BadRequestError('productIds must be a non-empty array')
    }

    const validProducts = await Product.findAll({
        where: { id: { [Op.in]: productIds }, discontinued: false },
        attributes: ['id'],
    })

    const validProductIds = validProducts.map((p) => p.id)

     // Already in this kitchen's inventory — skip, don't fail the whole batch over it
    const existingRows = await KitchenInventory.findAll({
        where: { kitchenId, productId: { [Op.in]: validProductIds } },
        attributes: ['productId'],
    })

    const alreadyImportedIds = existingRows.map((row) => row.productId)
 
    const toImportIds = validProductIds.filter((id) => !alreadyImportedIds.includes(id))
    const invalidIds = productIds.filter((id) => !validProductIds.includes(id))
 
    let created = []
    if (toImportIds.length) {
        created = await KitchenInventory.bulkCreate(
            toImportIds.map((productId) => ({
                kitchenId,
                productId,
                quantity: 0,
                isAvailable: false,
            }))
        )
    }
 
    return {
        imported: created.length,
        skippedAlreadyImported: alreadyImportedIds.length,
        skippedInvalid: invalidIds.length,
        invalidIds,
    }
}

export const getKitchenInventoryListService = async (
    kitchenId,
    { category, status, search, sort = 'name_asc', page = 1, limit = 20 }
) => {
 
    const where = { kitchenId }
 
    // Status is derived, not a stored column — "In Stock" means real stock
    // AND not manually turned off; anything else counts as "Out of Stock".
    if (status === 'in_stock') {
        where.quantity = { [Op.gt]: 0 }
        where.isAvailable = true
    } else if (status === 'out_of_stock') {
        where[Op.or] = [
            { quantity: { [Op.lte]: 0 } },
            { isAvailable: false },
        ]
    }else if (status === 'no_stock') {
        where[Op.or] = [
            { isAvailable: false },
        ]
    }else if (status === 'low_stock') {
        where[Op.and] = [
          { quantity: { [Op.gt]: 0 } },
          { quantity: { [Op.lt]: 5 } },
          { isAvailable: true },
        ]
      }
 
    const productWhere = {}
    if (category) productWhere.category = category
    if (search) productWhere.name = { [Op.iLike]: `%${search}%` }
 
    const offset = (page - 1) * limit
    const sortDirection = sort === 'name_desc' ? 'DESC' : 'ASC'
    let order

    switch (sort) {
      case 'quantity_desc':
        order = [['quantity', 'DESC']]
        break
  
      case 'quantity_asc':
        order = [['quantity', 'ASC']]
        break
  
      case 'name_asc':
      default:
        order = [
          [
            { model: Product, as: 'product' },
            'name',
            'ASC',
          ],
        ]
        break
    }

    const { rows, count } = await KitchenInventory.findAndCountAll({
        where,
        include: [{
            model: Product,
            as: 'product',
            where: Object.keys(productWhere).length ? productWhere : undefined,
            attributes: ['id', 'name', 'category', 'imageUrl'],
        }],
        limit: Number(limit),
        offset: Number(offset),
        // order: [[{ model: Product, as: 'product' }, 'name', sortDirection]],
        order,
    })
 
    const items = rows.map((row) => ({
        inventoryId: row.id,
        productId: row.productId,
        name: row.product.name,
        category: row.product.category,
        imageUrl: row.product.imageUrl,
        quantity: row.quantity,
        isAvailable: row.isAvailable,
        status: row.quantity > 0 && row.isAvailable ? 'In Stock' : 'Out of Stock',
    }))
 
    return {
        items,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit),
        },
    }
}

const toItemResponse = (inventoryRow) => ({
    id: inventoryRow.id,
    productId: inventoryRow.productId,
    quantity: inventoryRow.quantity,
    isAvailable: inventoryRow.isAvailable,
    status: inventoryRow.quantity > 0 && inventoryRow.isAvailable ? 'In Stock' : 'Out of Stock',
})
 
export const updateInventoryAvailabilityService = async (kitchenId, id, isAvailable) => {
 
    const inventoryRow = await KitchenInventory.findByPk(id)
    console.log(inventoryRow)
   
 
    if (!inventoryRow) {
       throw NotFoundError('Inventory item')
    }

    console.log(inventoryRow.kitchenId,kitchenId)
    assertKitchenOwnership(inventoryRow.kitchenId, kitchenId)
 
    await inventoryRow.update({ isAvailable })
 
    return toItemResponse(inventoryRow)
}
 
export const updateInventoryQuantityService = async (kitchenId, inventoryId, quantity) => {
 
    if (quantity === undefined || quantity === null || Number.isNaN(quantity) || quantity < 0) {
        throw BadRequestError('A valid, non-negative quantity is required')
    }
 
    const inventoryRow = await KitchenInventory.findByPk(inventoryId)
 
    if (!inventoryRow) {
        throw NotFoundError("Inventory ")
    }
 
    assertKitchenOwnership(inventoryRow.kitchenId, kitchenId)
 
    await inventoryRow.update({ quantity })
 
    return toItemResponse(inventoryRow)
}