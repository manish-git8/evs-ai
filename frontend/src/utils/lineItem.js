import CartService from '../services/CartService';

class LineItemHelper {
  static async getLineItemCount(cartId, companyId) {
    try {
      const response = await CartService.getCartDetailById(cartId, companyId);
      const items = Array.isArray(response.data) ? response.data : [];
      return items.length;
    } catch (error) {
      console.error(`Error fetching line item count for cart ${cartId}:`, error);
      return 0;
    }
  }
}

export default LineItemHelper;
