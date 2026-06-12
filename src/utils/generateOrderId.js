import crypto from 'node:crypto';
let counter=0;
export const generateOrderId = async (userId)=>{
    const uuidPart = userId
  .replace(/-/g, "")
  .slice(0, 8);

const userEntropy =parseInt(uuidPart, 16);

    const part1=(Date.now()+userEntropy).toString(36).toUpperCase().slice(-6);
    console.log(part1)



       // ===== HIGH RESOLUTION TIME =====

  const hr =
    Number(
      process.hrtime.bigint() %
      1000000n
    );

      // ===== RANDOM ENTROPY =====

  const rand =
    crypto.randomInt(
      10000,
      99999
    );

      const last5 = (
    hr +
    rand +
    counter
  ) % 100000;

   const part2 = last5
    .toString()
    .padStart(5, "0");

    const orderID = `OD${part1}${part2}`;
   
    return orderID
}