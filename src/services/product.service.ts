import { supabase, isSupabaseConfigured } from './supabase';
import { dbEngine } from '../../data/sqlDb';
import { Product } from '../types/product';

export const productApi = {
    fetchByBarcode: async (barcode: string, storeId: string): Promise<Product | null> => {
        // 1. Check if Supabase is set up
        if (!isSupabaseConfigured()) {
            console.warn("⚠️ Supabase keys missing. Using Offline Data.");
            return dbEngine.queryProductByBarcode(barcode, storeId);
        }

        try {
            // 2. Query Master Table
            const { data: masterData, error: masterError } = await supabase
                .from('product_master')
                .select('*')
                .eq('barcode', barcode)
                .single();

            if (masterError || !masterData) {
                console.log("Product not found in master");
                return null;
            }

            // 3. Query Store Price (Inventory)
            const { data: storeData } = await supabase
                .from('store_inventory')
                .select('store_price, store_discount')
                .eq('store_id', storeId)
                .eq('barcode', barcode)
                .single();

            // Default to MRP if not in specific store inventory
            const price = storeData ? storeData.store_price : masterData.base_mrp;
            const discount = storeData ? storeData.store_discount : 0;

            return {
                id: masterData.id,
                barcode: masterData.barcode,
                name: masterData.name,
                brand: masterData.brand,
                weight: masterData.weight,
                category: masterData.category,
                imageUrl: masterData.image_url,
                mrp: masterData.base_mrp,
                price: Number(price),
                discount: Number(discount)
            };

        } catch (err) {
            console.error("Supabase Error:", err);
            return null;
        }
    }
};
