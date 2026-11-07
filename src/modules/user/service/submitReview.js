import { BadRequestError, ForbiddenError } from "../../../middleware/ErrorHandler";
import Driver from "../../../models/driver";
import DriverReview from "../../../models/driverReview";
import Order from "../../../models/order";
import OrderItem from "../../../models/orderItem";
import Product from "../../../models/product";
import ProductReview from "../../../models/productReview";


export const submitReviewService = async(orderId, userId, items,driver)=>{
    await sequelize.transaction(async (t) => {

            // 1. Order must belong to the user and be delivered
      const order = await Order.findOne({
        where: { id: orderId,
             user_id: userId, 
             status: 'DELIVERED' },
        transaction: t,
      });
      if (!order) throw ForbiddenError("Order not found or not delivered");

        // 2. Product reviews
        for (const it of items) {
            const orderItem = await OrderItem.findOne({
              where: { 
                id: it.order_item_id,
                 order_id: orderId
                 },
              transaction: t,
            });
            if (!orderItem) throw BadRequestError("Invalid Order item");
            await ProductReview.create(
                {
                  order_item_id: orderItem.id,
                  product_id: orderItem.product_id,
                  user_id: userId,
                  rating: it.rating,
                  review: it.review?.trim() || null,
                },
                { transaction: t }
              );

              await Product.increment(
                { rating_sum: it.rating, rating_count: 1 },
                { where: { id: orderItem.product_id }, transaction: t }
              );

                // 3. Driver review
      if (driver) {
        const delivery = await delivery.findOne({
          where: { order_id: orderId },
          transaction: t,
        });
        if (!delivery) throw BadRequestError("Delivery not found");
        await DriverReview.create(
            {
              delivery_id: delivery.id,
              driver_id: delivery.driver_id,
              user_id: userId,
              rating: driver.rating,
              review: driver.review?.trim() || null,
            },
            { transaction: t }
          );
          await Driver.increment(
            { rating_sum: driver.rating, rating_count: 1 },
            { where: { id: delivery.driver_id }, transaction: t }
          );
      }


 
    }
})
return {
    message:"Thanks for your Feedback"
}
}
