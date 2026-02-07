
import { Product, OrderStatus } from '../src/types';

// --- SQL TABLE STRUCTURES ---

interface SQL_ProductMaster {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  weight: string;
  base_mrp: number; // The generic MRP
  image_url: string;
}

interface SQL_StoreInventory {
  product_id: string;
  store_price: number;
  store_discount: number;
  in_stock: boolean;
}

export interface SQL_ReceiptStatus {
  receipt_number: string;
  store_id: string;
  total_amount: number;
  payment_status: OrderStatus;
  created_at: string;
}

// --- 1. MASTER DATA TABLE (Global Catalog) ---
// Equivalent to: SELECT * FROM product_master;

export const TABLE_PRODUCT_MASTER: SQL_ProductMaster[] = [
  {
    id: 'prod-001',
    barcode: '8901088136945',
    name: 'Tata Salt Vacuum Evaporated',
    brand: 'Tata Consumer Products',
    weight: '1kg',
    base_mrp: 28,
    category: 'Staples',
    image_url: 'https://images.unsplash.com/photo-1518110903427-0ac99672692e?auto=format&fit=crop&w=200&h=200'
  },
  {
    id: 'prod-002',
    barcode: '8901296038567',
    name: 'Bru Instant Coffee Powder',
    brand: 'Hindustan Unilever',
    weight: '100g',
    base_mrp: 245,
    category: 'Beverages',
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=200&h=200'
  },
  {
    id: 'prod-003',
    barcode: '8904256023283',
    name: 'Dabur Red Ayurvedic Paste',
    brand: 'Dabur India',
    weight: '200g',
    base_mrp: 125,
    category: 'Personal Care',
    image_url: 'https://images.unsplash.com/photo-1559591937-e68214c549b2?auto=format&fit=crop&w=200&h=200'
  },
  {
    id: 'prod-004',
    barcode: '9556781001107',
    name: 'Maggi 2-Minute Masala Noodles',
    brand: 'Nestle',
    weight: '70g',
    base_mrp: 14,
    category: 'Instant Food',
    image_url: 'https://images.unsplash.com/photo-1612927335702-582178379c2e?auto=format&fit=crop&w=200&h=200'
  },
  {
    id: 'prod-005',
    barcode: '8902519002983',
    name: 'Parle-G Glucose Biscuits',
    brand: 'Parle Products',
    weight: '800g',
    base_mrp: 90,
    category: 'Biscuits',
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=200&h=200'
  },
  {
    id: 'prod-006',
    barcode: '8901725013745',
    name: 'Lizol Disinfectant Surface Cleaner',
    brand: 'Reckitt Benckiser',
    weight: '500ml',
    base_mrp: 115,
    category: 'Household',
    image_url: 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?auto=format&fit=crop&w=200&h=200'
  }
];

// --- 2. STORE SPECIFIC TABLES ---
// Requirement: "Each store should have its own table with the items, price, etc"

const TABLE_STORE_001_INVENTORY: SQL_StoreInventory[] = [
  // Malad West (Standard Pricing)
  { product_id: 'prod-001', store_price: 25, store_discount: 10, in_stock: true },
  { product_id: 'prod-002', store_price: 208, store_discount: 15, in_stock: true },
  { product_id: 'prod-003', store_price: 110, store_discount: 12, in_stock: true },
  { product_id: 'prod-004', store_price: 13, store_discount: 7, in_stock: true },
  { product_id: 'prod-005', store_price: 85, store_discount: 5, in_stock: true },
  { product_id: 'prod-006', store_price: 105, store_discount: 8, in_stock: true },
];

const TABLE_STORE_002_INVENTORY: SQL_StoreInventory[] = [
  // Powai (Premium Pricing ~15% higher)
  { product_id: 'prod-001', store_price: 30, store_discount: 0, in_stock: true },
  { product_id: 'prod-002', store_price: 240, store_discount: 2, in_stock: true },
  { product_id: 'prod-003', store_price: 125, store_discount: 0, in_stock: true }, // Selling at MRP
  { product_id: 'prod-004', store_price: 14, store_discount: 0, in_stock: true },
  { product_id: 'prod-005', store_price: 90, store_discount: 0, in_stock: true },
  { product_id: 'prod-006', store_price: 115, store_discount: 0, in_stock: true },
];

const TABLE_STORE_003_INVENTORY: SQL_StoreInventory[] = [
  // Thane (Wholesale Pricing ~10% lower)
  { product_id: 'prod-001', store_price: 22, store_discount: 20, in_stock: true },
  { product_id: 'prod-002', store_price: 190, store_discount: 22, in_stock: true },
  { product_id: 'prod-003', store_price: 100, store_discount: 20, in_stock: true },
  { product_id: 'prod-004', store_price: 12, store_discount: 14, in_stock: true },
  { product_id: 'prod-005', store_price: 80, store_discount: 11, in_stock: true },
  { product_id: 'prod-006', store_price: 95, store_discount: 17, in_stock: true },
];

// --- 3. RECEIPT STATUS TABLE (CENTRAL DATABASE) ---
// We simulate a central DB by persisting this variable to localStorage.
// In a real app, this would be a row in a PostgreSQL/MySQL database.

const DB_KEY_RECEIPTS = 'sql_central_receipt_registry_v1';

const loadReceiptTable = (): SQL_ReceiptStatus[] => {
  try {
    const data = localStorage.getItem(DB_KEY_RECEIPTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveReceiptTable = (table: SQL_ReceiptStatus[]) => {
  localStorage.setItem(DB_KEY_RECEIPTS, JSON.stringify(table));
};

export let TABLE_RECEIPT_STATUS_REGISTRY: SQL_ReceiptStatus[] = loadReceiptTable();


// --- DATABASE ENGINE (Simulating SQL Driver) ---

export const dbEngine = {
  // Query Mapper to select the correct table based on store ID
  getInventoryTable: (storeId: string): SQL_StoreInventory[] => {
    switch (storeId) {
      case 'store-001': return TABLE_STORE_001_INVENTORY;
      case 'store-002': return TABLE_STORE_002_INVENTORY;
      case 'store-003': return TABLE_STORE_003_INVENTORY;
      default: return TABLE_STORE_001_INVENTORY;
    }
  },

  // Simulates: SELECT * FROM master JOIN inventory ON id WHERE barcode = ?
  queryProductByBarcode: (barcode: string, storeId: string): Product | null => {
    // 1. Find in Master Table
    const masterRecord = TABLE_PRODUCT_MASTER.find(p => p.barcode === barcode);
    if (!masterRecord) return null;

    // 2. Select correct Store Table
    const storeTable = dbEngine.getInventoryTable(storeId);

    // 3. Find in Store Table
    const inventoryRecord = storeTable.find(i => i.product_id === masterRecord.id);

    // Default fallback if store doesn't carry item, use master values
    const price = inventoryRecord ? inventoryRecord.store_price : masterRecord.base_mrp;
    const discount = inventoryRecord ? inventoryRecord.store_discount : 0;

    // 4. Return Joined Data
    return {
      id: masterRecord.id,
      barcode: masterRecord.barcode,
      name: masterRecord.name,
      brand: masterRecord.brand,
      weight: masterRecord.weight,
      category: masterRecord.category,
      imageUrl: masterRecord.image_url,
      mrp: masterRecord.base_mrp,
      price: price,
      discount: discount
    };
  },

  // Simulates: INSERT INTO receipt_status ...
  insertReceiptStatus: (receipt: SQL_ReceiptStatus) => {
    TABLE_RECEIPT_STATUS_REGISTRY = loadReceiptTable(); // Refresh from DB
    TABLE_RECEIPT_STATUS_REGISTRY.push(receipt);
    saveReceiptTable(TABLE_RECEIPT_STATUS_REGISTRY); // Commit to DB
    console.log(`[SQL INSERT] INTO receipt_status_registry VALUES ('${receipt.receipt_number}', '${receipt.store_id}', ${receipt.total_amount}, '${receipt.payment_status}')`);
  },

  // Simulates: SELECT * FROM receipt_status WHERE receipt_number = ?
  selectReceipt: (receiptNumber: string): SQL_ReceiptStatus | null => {
    TABLE_RECEIPT_STATUS_REGISTRY = loadReceiptTable(); // Refresh from DB (sync with other tabs)
    return TABLE_RECEIPT_STATUS_REGISTRY.find(r => r.receipt_number === receiptNumber) || null;
  },

  // Simulates: UPDATE receipt_status SET payment_status = ? WHERE receipt_number = ?
  updateReceiptStatus: (receiptNumber: string, status: OrderStatus): boolean => {
    TABLE_RECEIPT_STATUS_REGISTRY = loadReceiptTable(); // Refresh from DB
    const index = TABLE_RECEIPT_STATUS_REGISTRY.findIndex(r => r.receipt_number === receiptNumber);

    if (index !== -1) {
      TABLE_RECEIPT_STATUS_REGISTRY[index].payment_status = status;
      saveReceiptTable(TABLE_RECEIPT_STATUS_REGISTRY); // Commit to DB
      console.log(`[SQL UPDATE] receipt_status_registry SET status='${status}' WHERE id='${receiptNumber}'`);
      return true;
    }
    return false;
  },

  // --- USER REWARD MANAGEMENT ---

  // Simulates: SELECT * FROM users WHERE wallet_address = ?
  getUserByWallet: (walletAddress: string): { walletAddress: string; rewardBalance: number } | null => {
    const users = loadUserTable();
    return users.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase()) || null;
  },

  // Simulates: UPSERT users SET reward_balance = reward_balance + ? WHERE wallet_address = ?
  updateUserReward: (walletAddress: string, amount: number) => {
    let users = loadUserTable();
    const index = users.findIndex(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());

    if (index !== -1) {
      users[index].rewardBalance = (users[index].rewardBalance || 0) + amount;
      console.log(`[SQL UPDATE] User ${walletAddress} new balance: ${users[index].rewardBalance}`);
    } else {
      // Create new user record if not exists
      users.push({ walletAddress, rewardBalance: amount });
      console.log(`[SQL INSERT] New User ${walletAddress} initialized with ${amount}`);
    }
    saveUserTable(users);
  }
};

// --- USER TABLE SIMULATION ---
const DB_KEY_USERS = 'sql_users_registry_v1';
interface SQL_User {
  walletAddress: string;
  rewardBalance: number;
}

const loadUserTable = (): SQL_User[] => {
  try {
    const data = localStorage.getItem(DB_KEY_USERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveUserTable = (table: SQL_User[]) => {
  localStorage.setItem(DB_KEY_USERS, JSON.stringify(table));
};
