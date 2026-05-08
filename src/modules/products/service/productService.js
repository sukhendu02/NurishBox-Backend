import { count } from "node:console";
import { NotFoundError } from "../../../middleware/ErrorHandler.js";
import Product from "../../../models/product.js"
import { Op } from "sequelize";

export const getallItemsService = async(query)=>{
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

// TEST 
// const products = await Product.findAll();
// return products;

    const {count,rows} = await Product.findAndCountAll({
    where,
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
      ["createdAt", "ASC"],
    ] ,  
 });
  
    return {
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