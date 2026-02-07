
import { Employee } from '../src/types';

export interface CashierResult {
  success: boolean;
  status: string;
  orderHash: string;
  amount?: number;
  timestamp: number;
}

export interface GuardResult {
  allowed: boolean;
  status: string;
  orderHash: string;
  timestamp: number;
  itemCount?: number;
}

// --- MOCK BLOCKCHAIN LEDGER ---
// In production, this is the blockchain state.
// Status: PENDING -> PAID -> USED (Exit Verified)
interface LedgerEntry {
  status: 'PENDING' | 'PAID' | 'USED';
  amount: number;
  items: number;
}

const MOCK_BLOCKCHAIN_LEDGER: Record<string, LedgerEntry> = {
  'hash_pending_1': { status: 'PENDING', amount: 450, items: 3 },
  'hash_paid_1': { status: 'PAID', amount: 1250, items: 8 },
  'hash_used_1': { status: 'USED', amount: 300, items: 2 },
};

// --- API SERVICE ---

export const authApi = {
  login: async (id: string, pass: string): Promise<Employee | null> => {
    await new Promise(r => setTimeout(r, 500)); // Network delay
    if (id && pass) {
      return {
        id,
        name: `Staff ${id}`,
        role: 'CASHIER'
      };
    }
    return null;
  }
};

export const cashierApi = {
  /**
   * Cashier scans QR -> Marks order as PAID on blockchain
   */
  markOrderPaid: async (orderHash: string): Promise<CashierResult> => {
    await new Promise(r => setTimeout(r, 800));

    // 1. Validate Hash
    if (!orderHash.startsWith('hash_')) {
      // For demo ease, we auto-create entries for unknown hashes so you can test easily
      MOCK_BLOCKCHAIN_LEDGER[orderHash] = { status: 'PENDING', amount: Math.floor(Math.random() * 2000), items: 5 };
    }

    const entry = MOCK_BLOCKCHAIN_LEDGER[orderHash];

    if (!entry) {
      return { success: false, status: 'INVALID_QR', orderHash, timestamp: Date.now() };
    }

    // 2. Check State
    if (entry.status === 'PAID' || entry.status === 'USED') {
      return {
        success: false,
        status: 'ALREADY_PAID',
        orderHash,
        amount: entry.amount,
        timestamp: Date.now()
      };
    }

    // 3. Update State (Write to Blockchain)
    entry.status = 'PAID';

    return {
      success: true,
      status: 'PAYMENT_CONFIRMED',
      orderHash,
      amount: entry.amount,
      timestamp: Date.now()
    };
  }
};

export const guardApi = {
  /**
   * Guard scans QR -> Checks if PAID -> Marks as USED (Exit)
   */
  verifyExit: async (orderHash: string): Promise<GuardResult> => {
    await new Promise(r => setTimeout(r, 600));

    const entry = MOCK_BLOCKCHAIN_LEDGER[orderHash];

    if (!entry) {
      return { allowed: false, status: 'INVALID_QR', orderHash, timestamp: Date.now() };
    }

    if (entry.status === 'PENDING') {
      return { allowed: false, status: 'PAYMENT_PENDING', orderHash, timestamp: Date.now() };
    }

    if (entry.status === 'USED') {
      return { allowed: false, status: 'QR_USED', orderHash, timestamp: Date.now() };
    }

    // If PAID, mark as USED and allow exit
    if (entry.status === 'PAID') {
      entry.status = 'USED'; // Burn the QR so it can't be used again
      return {
        allowed: true,
        status: 'EXIT_ALLOWED',
        orderHash,
        timestamp: Date.now(),
        itemCount: entry.items
      };
    }

    return { allowed: false, status: 'INVALID_QR', orderHash, timestamp: Date.now() };
  }
};
