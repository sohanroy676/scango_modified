import { dbEngine, TABLE_PRODUCT_MASTER } from "../../data/sqlDb";
import { supabase, isSupabaseConfigured } from "./supabase";
import Groq from "groq-sdk";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: number;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const aiService = {
  processQuery: async (query: string, storeId: string): Promise<string> => {
    if (!GROQ_API_KEY) {
      console.warn("Missing VITE_GROQ_API_KEY");
      return "I'm currently unable to provide advice as my connection is not configured.";
    }

    let context = "";

    // 1. Attempt to fetch data from Supabase for context
    if (isSupabaseConfigured() && storeId) {
      try {
        const { data: products } = await supabase.from("product_master").select("*");
        const { data: inventory } = await supabase
          .from("store_inventory")
          .select("*")
          .eq("store_id", storeId);

        if (products && inventory) {
          context = products
            .map((p) => {
              const inv = inventory.find((i) => i.barcode === p.barcode);
              if (!inv) return null;
              return `Product: ${p.name}, Brand: ${p.brand}, Price: ₹${inv.store_price}, Category: ${p.category}, Stock: ${inv.in_stock ? "Yes" : "No"}.`;
            })
            .filter(Boolean)
            .join("\n");
        }
      } catch (err) {
        console.error("Supabase context fetch error:", err);
      }
    }

    // 2. Fallback to Local Data Context if Supabase failed or returned empty
    if (!context && storeId) {
      const products = TABLE_PRODUCT_MASTER;
      const storeTable = dbEngine.getInventoryTable(storeId);
      context = products
        .map((p) => {
          const inv = storeTable.find((i) => i.product_id === p.id);
          if (!inv) return null;
          return `Product: ${p.name}, Brand: ${p.brand}, Price: ₹${inv.store_price}, Category: ${p.category}, Stock: ${inv.in_stock ? "Yes" : "No"}.`;
        })
        .filter(Boolean)
        .join("\n");
    }

    try {
      const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are ScanGo AI, a helpful in-store shopping assistant. 
                        
                        ${storeId ? `CURRENT STORE INVENTORY (${storeId}):\n${context}` : "Note: No store selected yet. Prompt user to select a store for specific inventory info."}
                        
                        RULES:
                        1. Use the provided inventory to answer questions about prices, locations, and availability.
                        2. If a product is mentioned but not in inventory, say it's not available in this store.
                        3. Provide helpful advice on cooking, health benefits, and product comparisons.
                        4. Be concise (max 3-4 sentences).
                        5. If no store is selected, ask the user to select one first for specific item info.`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        model: "llama-3.3-70b-versatile",
      });

      return completion.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (error) {
      console.error("Groq API Error:", error);
      return "I'm having trouble connecting right now. Please try again.";
    }
  },
  transcribeAudio: async (audioFile: File): Promise<string> => {
    if (!GROQ_API_KEY) return "";

    try {
      const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "text",
      });
      return transcription as any;
    } catch (error) {
      console.error("Transcription Error:", error);
      return "";
    }
  },
};
