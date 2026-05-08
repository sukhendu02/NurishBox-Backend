
import {getallItemsService } from "../service/productService.js"

export const getAllItems = async(req,res)=>{

    const response = await getallItemsService(req.query);
        res.status(200).json({
        success: true,
        items: response,
      });
}