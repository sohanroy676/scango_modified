import { supabase, isSupabaseConfigured } from './supabase';
import { dbEngine, SQL_ReceiptStatus } from '../../data/sqlDb';
import { Counter, PaymentMethod, Order, OrderStatus, Store, Employee } from '../types';
import { CartItem } from '../types/product';
import { API_CONFIG } from './config';

// --- MOCK DATA FOR UI ---
export const mockStores: Store[] = [
    { id: 'store-001', name: 'ScanGo Malad West', address: 'Link Road, Malad West, Mumbai', location: { lat: 19.1860, lng: 72.8485 } },
    { id: 'store-002', name: 'ScanGo Powai (Premium)', address: 'Hiranandani Gardens, Powai, Mumbai', location: { lat: 19.1197, lng: 72.9051 } },
    { id: 'store-003', name: 'ScanGo Thane (Wholesale)', address: 'Ghodbunder Road, Thane West', location: { lat: 19.2183, lng: 72.9781 } }
];

let counters: Counter[] = [
    { id: 'c1', number: 1, queueSize: 8, isActive: true },
    { id: 'c2', number: 2, queueSize: 3, isActive: true },
    { id: 'c3', number: 3, queueSize: 12, isActive: true },
    { id: 'c4', number: 4, queueSize: 1, isActive: true },
];

// --- API SERVICES ---

// New OTP API Service with Robust Error Handling
export const otpApi = {
    sendOtp: async (mobileNumber: string): Promise<{ success: boolean; message: string }> => {
        try {
            // Short timeout to detect backend down quickly
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${API_CONFIG.BASE_URL}/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobileNumber }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                // If server responds with error (e.g. 500 from Twilio), try to read message
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Server error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn("Backend Unreachable or Error:", error);
            // Fallback for demo when backend is offline or network fails
            await new Promise(r => setTimeout(r, 800));
            return { success: true, message: "OTP sent (Offline Mode)" };
        }
    },

    verifyOtp: async (mobileNumber: string, otp: string): Promise<{ success: boolean; message: string }> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${API_CONFIG.BASE_URL}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobileNumber, otp }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Server error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn("Backend Unreachable or Error:", error);
            await new Promise(r => setTimeout(r, 800));

            // Offline Validation Logic
            if (otp === '123456') {
                return { success: true, message: "Verified (Offline Mode)" };
            }
            return { success: false, message: "Invalid OTP (Simulation: Try 123456)" };
        }
    }
};

export const authApi = {
    login: async (employeeId: string, password: string): Promise<Employee | null> => {
        if (isSupabaseConfigured()) {
            const { data } = await supabase
                .from('employees')
                .select('*')
                .eq('employee_id', employeeId)
                .eq('password', password) // Note: In production, hash passwords!
                .single();

            if (data) {
                return { id: data.employee_id, name: data.name, role: 'CASHIER' };
            }
        }

        // Fallback Mock Login
        if (employeeId === 'admin' && password === '1234') {
            return { id: 'emp-001', name: 'Demo Employee', role: 'CASHIER' };
        }

        return null;
    }
};

export const storeApi = {
    getNearestStore: async (): Promise<Store> => {
        // For now, return mock stores as geolocation logic is usually client-side calculation
        // or requires a geospatial PostGIS query which is advanced.
        await new Promise(r => setTimeout(r, 600));
        return mockStores[0];
    },
    getStores: async (): Promise<Store[]> => {
        return mockStores;
    }
};

export const queueApi = {
    getOptimalCounter: async (): Promise<Counter> => {
        // Simple client-side logic for now
        const active = counters.filter(c => c.isActive);
        return active.reduce((prev, curr) => (prev.queueSize < curr.queueSize ? prev : curr));
    }
};

export const historyApi = {
    getOrders: (): Order[] => {
        // Reads from LocalStorage for the current user's history
        try {
            const stored = localStorage.getItem('dmart_orders_db');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }
};

export const checkoutApi = {
    createOrder: async (items: CartItem[], paymentMethod: PaymentMethod, storeName: string, walletAddress?: string): Promise<Order> => {
        const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const totalDiscount = items.reduce((acc, item) => acc + ((item.mrp - item.price) * item.quantity), 0);
        const receiptNumber = `RCP-${Math.floor(100000 + Math.random() * 900000)}`;
        const storeId = mockStores.find(s => s.name === storeName)?.id || 'store-001';

        // CASH = PENDING, UPI/CARD = PAID
        const status = paymentMethod === PaymentMethod.CASH ? OrderStatus.PENDING : OrderStatus.PAID;

        // --- 1. INSERT INTO SUPABASE (Real DB) ---
        if (isSupabaseConfigured()) {
            const { error } = await supabase
                .from('receipts')
                .insert([
                    {
                        receipt_number: receiptNumber,
                        store_id: storeId,
                        total_amount: totalAmount,
                        payment_status: status,
                        items_json: items // Storing full cart for record
                    }
                ]);

            if (error) console.error("Failed to save to Cloud DB", error);
        } else {
            // Fallback for simulation
            dbEngine.insertReceiptStatus({
                receipt_number: receiptNumber,
                store_id: storeId,
                total_amount: totalAmount,
                payment_status: status,
                created_at: new Date().toISOString()
            });
        }

        // --- 2. FETCH BLOCKCHAIN HASH FROM BACKEND ---
        let orderHash = '';
        try {
            console.log(`📡 Sending request to: ${API_CONFIG.BASE_URL}/orders/checkout`);
            const response = await fetch(`${API_CONFIG.BASE_URL}/orders/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: items, total: totalAmount, storeId, paymentMethod, userWallet: walletAddress })
            });
            console.log(`📡 Response status: ${response.status}`);

            if (!response.ok) {
                const errText = await response.text();
                console.error(`❌ Backend Error (${response.status}):`, errText);
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                console.log("✅ Blockchain Order Hash Received:", data.orderHash);
                orderHash = data.orderHash;
            }
        } catch (err) {
            console.error("⚠️ Blockchain sync failed, using offline fallback:", err);
            orderHash = `OFFLINE-${receiptNumber}`;
        }

        // --- 3. Create Local Order Object (For UI) ---
        // Note: We don't assign specific counter ID anymore per requirement
        const orderId = `DM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const order: Order = {
            id: orderId,
            receiptNumber,
            storeName,
            items,
            totalAmount,
            totalDiscount,
            paymentMethod,
            status: status,
            timestamp: Date.now(),
            orderHash,
            txHash: '' // Will be populated if returned by backend
        };

        // Save to Local History
        const existingHistory = historyApi.getOrders();
        // @ts-ignore
        localStorage.setItem('dmart_orders_db', JSON.stringify([order, ...existingHistory]));

        return order;
    }
};

export const cashierApi = {
    // Cashier searches for a receipt (Real-time DB lookup)
    getReceiptStatus: async (receiptNumber: string): Promise<SQL_ReceiptStatus | null> => {

        if (isSupabaseConfigured()) {
            const { data } = await supabase
                .from('receipts')
                .select('*')
                .eq('receipt_number', receiptNumber)
                .single();

            if (data) {
                return {
                    receipt_number: data.receipt_number,
                    store_id: data.store_id,
                    total_amount: data.total_amount,
                    payment_status: data.payment_status as OrderStatus,
                    created_at: data.created_at
                };
            }
        } else {
            // Mock latency
            await new Promise(r => setTimeout(r, 200));
            return dbEngine.selectReceipt(receiptNumber);
        }
        return null;
    },

    // Cashier updates status to PAID (Updates Real DB & Blockchain)
    updatePaymentStatus: async (receiptNumber: string, status: OrderStatus, orderHash?: string): Promise<boolean> => {

        // 1. Update Blockchain if orderHash is present
        if (orderHash && status === OrderStatus.PAID) {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/cashier/mark-paid`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderHash })
                });
                if (!response.ok) console.warn("Blockchain payment update failed");
            } catch (e) {
                console.warn("Blockchain unreachable", e);
            }
        }

        // 2. Update Database
        if (isSupabaseConfigured()) {
            const { error } = await supabase
                .from('receipts')
                .update({ payment_status: status })
                .eq('receipt_number', receiptNumber);

            return !error;
        } else {
            await new Promise(r => setTimeout(r, 500));
            return dbEngine.updateReceiptStatus(receiptNumber, status);
        }
    }
};

export const guardApi = {
    verifyExit: async (orderHash: string): Promise<{ success: boolean; status: string }> => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/guard/verify-exit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderHash })
            });

            if (!response.ok) {
                const err = await response.json();
                return { success: false, status: err.status || 'VERIFICATION_FAILED' };
            }

            const data = await response.json();
            return { success: true, status: data.status };
        } catch (e) {
            console.error("Guard API Error", e);
            return { success: false, status: 'NETWORK_ERROR' };
        }
    }
};

export const userApi = {
    getByWallet: async (walletAddress: string): Promise<{ rewardBalance: number }> => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/users/${walletAddress}`);
            if (!response.ok) return { rewardBalance: 0 };
            return await response.json();
        } catch (e) {
            console.error("Failed to fetch user data", e);
            return { rewardBalance: 0 };
        }
    }
};
