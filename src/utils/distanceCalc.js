const EARTH_RADIUS_KM = 6371.0088

function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

export const harversineDistance=(lat1,lng1,lat2,lng2)=>{
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    
    const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return parseFloat((EARTH_RADIUS_KM * c).toFixed(4))
}

 const PREP_TIME = 15;
  const AVG_SPEED = 22;

  
export const calculateEta = ( kitchenLat,kitchenLng,userLat,userLng) => {
  const distanceKm = harversineDistance(kitchenLat,kitchenLng,userLat,userLng)

  const roadDistanceKm = distanceKm * 1.4;
const travelTime =Math.ceil(
    (roadDistanceKm / AVG_SPEED) * 60
    );

  return {
    distanceKm,
    etaMinutes: PREP_TIME + travelTime,
  };
};


// GHAR
// const lat1 = 23.239102;
//   const lng1 = 77.441538
//   // ASHIMA
//   const lat2 = 23.182104
//   const lng2 = 77.455792
//   // DB MALL
//   const lat3 =23.232620
//   const lng3 = 77.430430
// console.log(calculateEta(lat1,lng1,lat3,lng3))