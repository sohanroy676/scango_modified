import { QRCodePayload } from '../types/order';

/**
 * 🛡️ PRODUCTION QR PARSER
 * Safe utility to parse and validate the ScanGo QR JSON payload.
 */
export const qrParser = {
  /**
   * Parses a raw string from the scanner into a validated QRCodePayload.
   * Throws errors for malformed JSON or missing fields.
   */
  parse: (rawString: string): QRCodePayload => {
    try {
      // 1. Attempt JSON parsing
      const data = JSON.parse(rawString);

      // 2. Structural Validation
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid payload: Not an object');
      }

      // 3. Field Validation (Defensive Checks)
      if (!data.orderHash || typeof data.orderHash !== 'string') {
        throw new Error('Invalid payload: Missing or invalid orderHash');
      }

      if (!data.txHash || typeof data.txHash !== 'string') {
        throw new Error('Invalid payload: Missing or invalid txHash');
      }

      if (!data.receiptNumber || typeof data.receiptNumber !== 'string') {
        throw new Error('Invalid payload: Missing or invalid receiptNumber');
      }

      // 4. Return typed object
      return {
        orderHash: data.orderHash,
        txHash: data.txHash,
        receiptNumber: data.receiptNumber
      };
    } catch (err) {
      console.error('QR Parsing Failure:', err);
      throw new Error(`QR_MALFORMED: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
};
