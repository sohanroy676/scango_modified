import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, ChevronLeft } from 'lucide-react';
import { storeApi } from '../services/api';
import { Store } from '../types';

interface StoreSelectProps {
    onSelectStore: (store: Store) => void;
    onError: (msg: string) => void;
    setProcessing: (loading: boolean) => void;
    isProcessing: boolean;
}

export const StoreSelect: React.FC<StoreSelectProps> = ({ onSelectStore, onError, setProcessing, isProcessing }) => {
    const [stores, setStores] = useState<Store[]>([]);

    useEffect(() => {
        storeApi.getStores().then(setStores);
    }, []);

    const detectLocation = async () => {
        setProcessing(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async () => {
                const nearest = await storeApi.getNearestStore();
                onSelectStore(nearest);
                setProcessing(false);
            }, () => {
                onError("Location Denied. Select manually.");
                setProcessing(false);
            });
        } else {
            onError("Geolocation not supported");
            setProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="bg-white p-6 pb-4 shadow-sm z-10">
                <h1 className="text-2xl font-black text-[#007041]">Select Store</h1>
                <p className="text-gray-400 text-sm font-medium">Choose where you are shopping today</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <button
                    onClick={detectLocation}
                    className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4 mb-4 text-blue-700 active:scale-95 transition"
                >
                    <div className="bg-white p-2 rounded-full shadow-sm"><Navigation size={20} className="text-blue-600" /></div>
                    <div className="text-left flex-1">
                        <h3 className="font-black text-sm">Use Current Location</h3>
                        <p className="text-xs opacity-70">Detect nearest ScanGo</p>
                    </div>
                    {isProcessing && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full"></div>}
                </button>

                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Nearby Stores</h4>

                {stores.map(store => (
                    <button
                        key={store.id}
                        onClick={() => onSelectStore(store)}
                        className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-[#007041] transition active:scale-[0.98]"
                    >
                        <div className="bg-gray-100 p-3 rounded-xl text-gray-500"><MapPin size={20} /></div>
                        <div className="text-left flex-1">
                            <h3 className="font-bold text-gray-800">{store.name}</h3>
                            <p className="text-xs text-gray-400">{store.address}</p>
                            {store.id === 'store-002' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded font-black mt-1 inline-block">PREMIUM</span>}
                            {store.id === 'store-003' && <span className="text-[9px] bg-green-100 text-green-600 px-1.5 rounded font-black mt-1 inline-block">WHOLESALE</span>}
                        </div>
                        <ChevronLeft size={16} className="rotate-180 text-gray-300" />
                    </button>
                ))}
            </div>
        </div>
    );
};
