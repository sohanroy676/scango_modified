import React from 'react';
import { ChevronLeft, ShoppingCart, Minus, Plus, SearchCode, ArrowRight } from 'lucide-react';
import { Store, Screen } from '../types';
import { Product, CartItem } from '../types/product';
import { Scanner as BarcodeScanner } from '../components/Scanner/Scanner';

interface ScanProps {
    store: Store | null;
    onScreenChange: (s: Screen) => void;
    onScan: (code: string) => void;
    manualInput: string;
    setManualInput: (v: string) => void;
    isProcessing: boolean;
    lastScanned: Product | null;
    setLastScanned: (p: Product | null) => void;
    scanQuantity: number;
    setScanQuantity: (q: number) => void;
    addToCart: (p: Product, q: number) => void;
    cart: CartItem[];
    error: string | null;
    totalAmount: number;
}

export const Scan: React.FC<ScanProps> = ({
    store, onScreenChange, onScan, manualInput, setManualInput, isProcessing,
    lastScanned, setLastScanned, scanQuantity, setScanQuantity, addToCart, cart,
    error, totalAmount
}) => {
    return (
        <div className="h-full flex flex-col bg-black relative">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pb-12">
                <button onClick={() => onScreenChange('HOME')} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Store</span>
                    <span className="text-sm font-black text-white">{store?.name}</span>
                </div>
            </div>

            {/* Camera View */}
            <div className="relative h-[50vh]">
                <BarcodeScanner onScan={onScan} variant="rectangle" />
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
                        <div className="w-12 h-12 border-4 border-[#007041] border-t-transparent animate-spin rounded-full"></div>
                    </div>
                )}
                {error && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-xl z-40 animate-bounce">
                        {error}
                    </div>
                )}
            </div>

            {/* Footer Controls */}
            <div className="bg-white rounded-t-3xl p-4 pb-6 z-20 -mt-4">
                {/* Manual Entry */}
                <div className="flex gap-2 mb-3">
                    <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-3 border border-gray-200 focus-within:border-[#007041] transition">
                        <SearchCode size={18} className="text-gray-400" />
                        <input
                            type="text"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="Enter barcode"
                            className="w-full bg-transparent p-3 outline-none font-bold text-gray-700 text-sm"
                        />
                    </div>
                    <button
                        onClick={() => { if (manualInput) { onScan(manualInput); setManualInput(''); } }}
                        className="bg-gray-800 text-white p-3 rounded-xl font-bold"
                    >
                        <ArrowRight size={20} />
                    </button>
                </div>

                {/* Cart Summary Button */}
                <button
                    onClick={() => onScreenChange('CART')}
                    className="w-full bg-[#007041] text-white p-3 rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-between group active:scale-[0.98] transition"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg relative">
                            <ShoppingCart size={20} />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.reduce((a, c) => a + c.quantity, 0)}</span>}
                        </div>
                        <div className="text-left">
                            <span className="block text-xs text-green-100 font-medium">Total Bill</span>
                            <span className="block text-lg font-black">₹{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg group-hover:bg-white/20 transition">
                        View Cart <ChevronLeft size={14} className="rotate-180" />
                    </div>
                </button>
            </div>

            {/* Product Scanned Modal */}
            {lastScanned && (
                <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in slide-in-from-bottom-10">
                    <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
                        <div className="flex gap-4 mb-6">
                            <img src={lastScanned.imageUrl} alt={lastScanned.name} className="w-24 h-24 rounded-xl object-cover bg-gray-100" />
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-800 leading-tight mb-1">{lastScanned.name}</h3>
                                <p className="text-xs text-gray-500 mb-2">{lastScanned.brand} • {lastScanned.weight}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-[#007041]">₹{lastScanned.price}</span>
                                    {lastScanned.discount > 0 && (
                                        <>
                                            <span className="text-sm text-gray-400 line-through">₹{lastScanned.mrp}</span>
                                            <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                                {Math.round((lastScanned.discount / lastScanned.mrp) * 100)}% OFF
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-sm font-bold text-gray-500">Quantity</span>
                            <div className="flex items-center gap-6">
                                <button onClick={() => setScanQuantity(Math.max(1, scanQuantity - 1))} className="w-10 h-10 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100">
                                    <Minus size={20} />
                                </button>
                                <span className="text-2xl font-black w-8 text-center">{scanQuantity}</span>
                                <button onClick={() => setScanQuantity(scanQuantity + 1)} className="w-10 h-10 rounded-full bg-[#007041] shadow text-white flex items-center justify-center active:bg-green-800">
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setLastScanned(null)}
                                className="flex-1 py-4 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => addToCart(lastScanned, scanQuantity)}
                                className="flex-[2] py-4 rounded-xl font-bold text-white bg-[#007041] hover:bg-green-800 shadow-lg shadow-green-900/20 transition"
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
