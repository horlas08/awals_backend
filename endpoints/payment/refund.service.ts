import axios from 'axios';

interface MyFatoorahRefundRequest {
  KeyType: 'PaymentId' | 'CustomerReference';
  Key: string;
  RefundChargeOnCustomer: boolean;
  ServiceChargeOnCustomer: boolean;
  Amount: number;
  Comment?: string;
  AmountDeductedFromSupplier?: number;
}

interface MyFatoorahRefundResponse {
  IsSuccess: boolean;
  Message: string;
  ValidationErrors: any[];
  Data: {
    RefundId: number;
    RefundReference: string;
    Amount: number;
    RefundStatus: string;
  };
}

interface PayPalRefundRequest {
  amount: {
    value: string;
    currency_code: string;
  };
  note_to_payer?: string;
}

interface PayPalRefundResponse {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: {
    value: string;
    currency_code: string;
  };
}

export class RefundService {
  private static MYFATOORAH_API_KEY = process.env.MYFATOORAH_API_KEY || '';
  private static MYFATOORAH_BASE_URL = process.env.MYFATOORAH_BASE_URL || 'https://apitest.myfatoorah.com';
  private static PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
  private static PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
  private static PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  /**
   * Process refund via MyFatoorah
   * @param paymentId - MyFatoorah payment ID
   * @param amount - Amount to refund
   * @param comment - Optional comment
   */
  static async refundMyFatoorah(
    paymentId: string,
    amount: number,
    comment?: string
  ): Promise<{ success: boolean; refundId?: string; message: string }> {
    try {
      const refundData: MyFatoorahRefundRequest = {
        KeyType: 'PaymentId',
        Key: paymentId,
        RefundChargeOnCustomer: false,
        ServiceChargeOnCustomer: false,
        Amount: amount,
        Comment: comment || 'Booking cancellation refund',
      };

      const response = await axios.post<MyFatoorahRefundResponse>(
        `${this.MYFATOORAH_BASE_URL}/v2/MakeRefund`,
        refundData,
        {
          headers: {
            'Authorization': `Bearer ${this.MYFATOORAH_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.IsSuccess) {
        return {
          success: true,
          refundId: response.data.Data.RefundReference,
          message: 'Refund processed successfully',
        };
      } else {
        return {
          success: false,
          message: response.data.Message || 'Refund failed',
        };
      }
    } catch (error: any) {
      console.error('MyFatoorah refund error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.Message || 'Failed to process refund via MyFatoorah',
      };
    }
  }

  /**
   * Get PayPal access token
   */
  private static async getPayPalAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${this.PAYPAL_CLIENT_ID}:${this.PAYPAL_CLIENT_SECRET}`
      ).toString('base64');

      const response = await axios.post(
        `${this.PAYPAL_BASE_URL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error: any) {
      console.error('PayPal auth error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with PayPal');
    }
  }

  /**
   * Process refund via PayPal
   * @param captureId - PayPal capture ID (transaction ID)
   * @param amount - Amount to refund
   * @param currency - Currency code (default: USD)
   * @param note - Optional note to payer
   */
  static async refundPayPal(
    captureId: string,
    amount: number,
    currency: string = 'USD',
    note?: string
  ): Promise<{ success: boolean; refundId?: string; message: string }> {
    try {
      const accessToken = await this.getPayPalAccessToken();

      const refundData: PayPalRefundRequest = {
        amount: {
          value: amount.toFixed(2),
          currency_code: currency,
        },
        note_to_payer: note || 'Booking cancellation refund',
      };

      const response = await axios.post<PayPalRefundResponse>(
        `${this.PAYPAL_BASE_URL}/v2/payments/captures/${captureId}/refund`,
        refundData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 'COMPLETED') {
        return {
          success: true,
          refundId: response.data.id,
          message: 'Refund processed successfully',
        };
      } else if (response.data.status === 'PENDING') {
        return {
          success: true,
          refundId: response.data.id,
          message: 'Refund is pending',
        };
      } else {
        return {
          success: false,
          message: 'Refund failed',
        };
      }
    } catch (error: any) {
      console.error('PayPal refund error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to process refund via PayPal',
      };
    }
  }

  /**
   * Process refund based on payment method
   * @param paymentMethod - 'myfatoorah', 'paypal', or 'points'
   * @param transactionId - Payment transaction ID
   * @param amount - Amount to refund
   * @param currency - Currency code
   */
  static async processRefund(
    paymentMethod: string,
    transactionId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<{ success: boolean; refundId?: string; message: string }> {
    switch (paymentMethod.toLowerCase()) {
      case 'myfatoorah':
        return await this.refundMyFatoorah(transactionId, amount);
      
      case 'paypal':
        return await this.refundPayPal(transactionId, amount, currency);
      
      case 'points':
        // Points refund is handled in the booking service (direct database update)
        return {
          success: true,
          message: 'Points refunded successfully',
        };
      
      default:
        return {
          success: false,
          message: `Unsupported payment method: ${paymentMethod}`,
        };
    }
  }
}
