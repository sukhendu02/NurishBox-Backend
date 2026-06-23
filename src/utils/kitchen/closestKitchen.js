import { harversineDistance } from "../distanceCalc.js"


// FIND THE CLOSEST DISTANCE AND OPERATIONAL KITCHEN
export const findClosestKitchen = (userCoords, kitchens)=>{
  const withinRadius = rankKitchensByDistance(userCoords, kitchens)
const active = withinRadius.filter(({ kitchen }) => kitchen.isActive === true)
console.log(active)
  if (active.length === 0) return null
  return active[0]

}


// LIST OF THE KITCHEN IN THE RADIUS
export const rankKitchensByDistance= (userCoords, kitchens)=> {
  const userLat = parseFloat(userCoords.latitude)
  const userLng = parseFloat(userCoords.longitude)
 
  return kitchens
    .map((kitchen) => ({
      kitchen,
      distanceKm: harversineDistance(
        userLat,
        userLng,
        parseFloat(kitchen.latitude),
        parseFloat(kitchen.longitude)
      ),
    }))
    .filter(({ kitchen, distanceKm }) => distanceKm <= parseFloat(kitchen.radiusKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)
}



// FIND CLOSEST KITCHEN WHICH IS ACCEPTING ORDER


export function findClosestOperationalKitchen(userCoords, kitchens) {
  const withinRadius = rankKitchensByDistance(userCoords, kitchens)
 
  // Requires both isActive AND acceptingOrders
  const operational = withinRadius.filter(
    ({ kitchen }) => kitchen.isActive === true && kitchen.acceptingOrders === true
  )
 
  if (operational.length === 0) return null
 
  return operational[0] // already sorted by distance
}