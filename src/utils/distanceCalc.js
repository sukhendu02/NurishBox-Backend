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



// const lat1 = 23.239102;
//   const lng1 = 77.441538
//   const lat2 = 23.182104
//   const lng2 = 77.455792
// console.log(harversineDistance(lat1,lat2,lng1,lng2))