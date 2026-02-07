import React from 'react';
import { MapPin, Camera, Receipt, LayoutDashboard, LogOut, Award } from 'lucide-react';
import { User, Store, Screen } from '../types';
import { LOGO_URL } from '../constants';
import { rewardService } from '../services/reward.service'; // Keep for blockchain fallback if needed?
import { userApi } from '../services/api';

interface HomeProps {
    user: User | null;
    store: Store | null;
    onChangeScreen: (s: Screen) => void;
    onLogout: () => void;
}

export const Home: React.FC<HomeProps> = ({ user, store, onChangeScreen, onLogout }) => {
    const [balance, setBalance] = React.useState<string>("0");

    React.useEffect(() => {
        const fetchBalance = async () => {
            if (user?.walletAddress) {
                // 1. Try DB first (Instant)
                const dbData = await userApi.getByWallet(user.walletAddress);
                setBalance(dbData.rewardBalance.toString());

                // 2. Optional: Re-verify with Blockchain (Updates only if higher/different)
                // rewardService.getBalance(user.walletAddress).then(val => { ... });
            }
        };
        fetchBalance();

        // Poll for updates every 5 seconds (to catch async updates if any)
        const interval = setInterval(fetchBalance, 5000);
        return () => clearInterval(interval);
    }, [user]);

    return (
        <div className="p-6 flex flex-col items-center justify-center h-full relative">
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
                <div className="flex flex-col items-start">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Hello,</span>
                    <span className="text-lg font-black text-gray-800">{user?.name || user?.phoneNumber || 'Guest'}</span>
                </div>
                <button onClick={() => onChangeScreen('STORE_SELECT')} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    <MapPin size={12} className="text-[#007041]" />
                    <span className="text-[10px] font-bold text-gray-600 max-w-[100px] truncate">{store?.name || 'Select Store'}</span>
                </button>
            </div>

            {/* REWARD POINTS DISPLAY */}
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full shadow-sm border border-yellow-100">
                <Award size={16} className="text-yellow-600" />
                <span className="text-xs font-bold text-yellow-800">{balance} SRT</span>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border-b-8 border-[#007041] mt-12">
                <div className="flex justify-center -mb-6">
                    <img src={LOGO_URL} alt="ScanGo Logo" className="h-70 object-contain" />
                </div>
                <p className="text-gray-500 mb-8 font-medium">Verify your items at the door with a digital invoice.</p>
                <button
                    onClick={() => onChangeScreen('SCANNER')}
                    className="w-full bg-[#007041] text-white py-4 rounded-xl font-bold text-lg hover:bg-green-800 transition shadow-lg flex items-center justify-center gap-2"
                >
                    <Camera size={24} /> Start Shopping
                </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                <button onClick={() => onChangeScreen('HISTORY')} className="bg-white p-4 rounded-2xl shadow border border-gray-100 flex flex-col items-center gap-2">
                    <Receipt size={24} className="text-gray-600" />
                    <span className="text-xs font-semibold">Past Orders</span>
                </button>
                <button onClick={() => onChangeScreen('DOCS')} className="bg-white p-4 rounded-2xl shadow border border-gray-100 flex flex-col items-center gap-2">
                    <LayoutDashboard size={24} className="text-purple-600" />
                    <span className="text-xs font-semibold">System Docs</span>
                </button>
            </div>

            <button onClick={onLogout} className="mt-auto flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-red-500 transition pt-6">
                <LogOut size={14} /> Switch Store
            </button>
        </div>
    );
};
