import { count } from "node:console";
import { NotFoundError } from "../../../middleware/ErrorHandler.js";
import Product from "../../../models/product.js"
import { Op } from "sequelize";
import Kitchen from "../../../models/kitchen.js";
import {findClosestOperationalKitchen} from "../../../utils/kitchen/closestKitchen.js"
import KitchenInventory from "../../../models/kitchenInventory.js";
export const getallItemsService = async(query,context={})=>{
     const {
    category,
    type,
    search,
    goal,
    minCalories,
    maxCalories,
    minPrice,
    maxPrice,
    featured,
    popular,
    sortBy  ,
    order   = "asc",
    page    = 1,
    limit   = 10,
  } = query;


  const { kitchenId, latitude, longitude } = context

   const { kitchen, status, message } = await resolveKitchen(kitchenId, latitude, longitude)

  
   const canOrder = status === 'open'
//   Build dynamic filters based on query parameters
  const where={
    discontinued:false,
    deletedAt:null
  }
  // Category filter
   // ── Category ──────────────────────────────────────────
  if (category) {
    const cats = category.split(",").map((c) => c.trim().toUpperCase());
    where.category = cats.length === 1 ? cats[0] : { [Op.in]: cats };
  }

   if (type) {
    where.type = type.trim().toUpperCase();
  }

    if (goal) {
    const goals = goal.split(",").map((g) => g.trim());
    where.goal = goals.length === 1 ? goals[0] : { [Op.in]: goals };
  }

   if (featured === "true") where.isFeatured = true;
 if (popular === "true") where.isPopular = true;

  if (minPrice || maxPrice) {
    where.basePrice = {};
    if (minPrice) where.basePrice[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.basePrice[Op.lte] = parseFloat(maxPrice);
  }
  if (query.discounted === 'true') {
  where.discountPrice = { [Op.ne]: null };
}

   if (minCalories || maxCalories) {
    where.caloriesKcal = {};
    if (minCalories) where.caloriesKcal[Op.gte] = parseInt(minCalories);
    if (maxCalories) where.caloriesKcal[Op.lte] = parseInt(maxCalories);
  }

   const sortMap = {
    price_asc:     ["basePrice",    "ASC"],
    price_desc:    ["basePrice",    "DESC"],
    calories_asc:  ["caloriesKcal", "ASC"],
    calories_desc: ["caloriesKcal", "DESC"],
    popular:       ["totalOrders",  "DESC"],
    newest:        ["createdAt",    "DESC"],
  };

    const orderBy = sortMap[sortBy] ?? ["isFeatured", "DESC"];

  // ── Pagination calculation ─────────────────────────────
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // cap at 50
  const offset   = (pageNum - 1) * limitNum;


   // ── Step 3: build include for kitchen inventory ──────────────────
  // If we have an operational kitchen → filter by its inventory
  // If not → return master catalogue (no inventory join)
  const include = kitchen
    ? [
        {
          model:    KitchenInventory,
          as:       'inventory',
          required: true, // INNER JOIN — only products this kitchen has
          where:    { kitchenId: kitchen.id, 
            // quantity: { [Op.gt]: 0 },
            //  isAvailable: true 
            },
          attributes: ['quantity', 'isAvailable'],
        },
      ]
    : [] // no join — master catalogue

    const {count,rows} = await Product.findAndCountAll({
    where,
    include,
     limit:  limitNum,
    offset,
    attributes:[
        "id",
        "name",
        "description",
        "category",
        "imageUrl",
        "type",
        "goal",
        "caloriesKcal",
        "proteinG",
        "carbsG",
        "fatG" ,
        "ingredients",
        "allergens",
        "basePrice",
        "discountPrice",
        "isAvailable",
        "servingSize",
        "isFeatured",
        "isPopular",
        "isAvailable",
        "weight",
        
    ],
    order: [orderBy,
    ["isPopular", "DESC"],
      // ["createdAt", "ASC"],
    ] , 
    distinct:true, 
 });
  

    return {
      kitchen: kitchen
      ? { id: kitchen.id, name: kitchen.name }
      : null,
    status,
    canOrder,
    message,
  count: count,
     pagination: {
      total:       count,
      page:        pageNum,
      limit:       limitNum,
      totalPages:  Math.ceil(count / limitNum),
      hasNextPage: pageNum < Math.ceil(count / limitNum),
      hasPrevPage: pageNum > 1,
    },
        data:rows,
        
        
    };
}


async function resolveKitchen(kitchenId, latitude, longitude) {
  // ── No location at all ─────────────────────────────────────────
  if (!kitchenId && (!latitude || !longitude)) {
    return { kitchen: null, status: 'no_location', message: 'Enable location or add an address to check delivery availability' }
  }
 
  // ── Has kitchenId — check if it is operational right now ───────
  if (kitchenId) {
    const mapped = await Kitchen.findOne({
      where:      { id: kitchenId },
      attributes: ['id', 'name', 'isActive', 'acceptingOrders', 'latitude', 'longitude', 'radiusKm'],
    })
 
    if (mapped && mapped.isActive && mapped.acceptingOrders) {
      // Mapped kitchen is fully operational — use it
      return { kitchen: mapped, status: 'open', message: null }
    }
 
    // Mapped kitchen is inactive or paused — try to find alternate in range
    if (latitude && longitude) {
      const allKitchens = await Kitchen.findAll({
        where:      { isActive: true, acceptingOrders: true },
        attributes: ['id', 'name', 'isActive', 'acceptingOrders', 'latitude', 'longitude', 'radiusKm'],
      })
 
      const result = findClosestOperationalKitchen(
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        allKitchens.map(k => k.toJSON())
      )
 
      if (result) {
        // Alternate kitchen found — use it for this request only, do NOT save
        return { kitchen: result.kitchen, status: 'open', message: null }
      }
    }
 
    // No operational kitchen found anywhere in range
    const reason = mapped && mapped.isActive && !mapped.acceptingOrders
      ? { status: 'not_accepting', message: 'Currently not accepting orders.' }
      : { status: 'not_serviceable', message: "We don't deliver to your area yet" }
 
    return { kitchen: null, ...reason }
  }
 
  // ── No kitchenId but has lat/lng (guest or no saved address) ───
  const allKitchens = await Kitchen.findAll({
    where:      { isActive: true, acceptingOrders: true },
    attributes: ['id', 'name', 'isActive', 'acceptingOrders', 'latitude', 'longitude', 'radiusKm'],
  })
 
  const result = findClosestOperationalKitchen(
    { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
    allKitchens.map(k => k.toJSON())
  )
 
  if (!result) {
    return { kitchen: null, status: 'not_serviceable', message: "We don't deliver to your area yet" }
  }
 
  return { kitchen: result.kitchen, status: 'open', message: null }
}


// SUGGESTED ITEMS SERVICE
export const getSuggestedItemsService = async(kitchenId, cartItems)=>{
    const SUGGESTION_LIMIT = 6
      if (!kitchenId) return []

console.log(cartItems)
const cartProductIds = cartItems.map(item => item.product?.id).filter(Boolean)
const cartCategories = [...new Set(
  cartItems.map(item => item.product?.category).filter(Boolean)
)]

const inventoryRows = await KitchenInventory.findAll({
  where: { kitchenId, isAvailable: true, quantity: { [Op.gt]: 0 } },
  attributes: ['productId'],
})

   const availableProductIds = inventoryRows.map(r => r.productId)

      if (availableProductIds.length === 0) return []

      const excludeIds = [...cartProductIds]


// Step 1 — same category, available at this kitchen, not in cart
let candidates = await Product.findAll({
    where: {
      id: {
        [Op.in]: availableProductIds,
        [Op.notIn]: excludeIds.length ? excludeIds : [null],
      },
      discontinued: false,
      ...(cartCategories.length ? { category: { [Op.in]: cartCategories } } : {}),
    },
    order: [['totalOrders', 'DESC']],
    limit: SUGGESTION_LIMIT,
  })
  
  
  // Step 2 — backfill with kitchen-wide bestsellers if not enough in-category matches
  if (candidates.length < SUGGESTION_LIMIT) {
    const excludeMore = [...excludeIds, ...candidates.map(c => c.id)]
    const backfill = await Product.findAll({
      where: {
        id: {
          [Op.in]: availableProductIds,
          [Op.notIn]: excludeMore.length ? excludeMore : [null],
        },
        discontinued: false,
      },
      order: [['totalOrders', 'DESC']],
      limit: SUGGESTION_LIMIT - candidates.length,
    })
    candidates = [...candidates, ...backfill]
  }


  return candidates
  
}