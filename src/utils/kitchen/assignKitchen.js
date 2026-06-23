import Address from "../../models/address.js";
import Kitchen from "../../models/kitchen.js"

import {findClosestKitchen} from "../kitchen/closestKitchen.js"



export const assignKitchentoAddress= async(addressId,latitude,longitude,transaction)=>{

    
    if(!latitude || !longitude){
        console.log("Invalid or missing longitude and latitude");
        return null;
    }
    const kitchens = await Kitchen.findAll({
        where:{isActive:true},
        attributes:['id','name','latitude','longitude','radiusKm','isActive'],
        ...(transaction?{transaction}:{}),
    })

    
    if(kitchens.length===0){
        console.log("No active kitchen found")
        return null;
    }

    const result = findClosestKitchen({latitude:parseFloat(latitude),longitude:parseFloat(longitude)},
    kitchens.map(k=>k.toJSON())
)

    if(!result){
        console.log("No kitchen serves this address")
        return null;
    }

    await Address.update(
        {kitchenId:result.kitchen.id},
        {
            where:{id:addressId},
            ...(transaction? {transaction}:{}),
        }
    )

    // console.log("kitchen assigned")
     console.log(`[assignKitchen] Address ${addressId} → Kitchen "${result.kitchen.name}" (${result.distanceKm} km)`)
     return{
        kitchenId:result.kitchen.id,
        kitchenName:result.kitchen.name,
        distanceKm:result.distanceKm,
     }
}