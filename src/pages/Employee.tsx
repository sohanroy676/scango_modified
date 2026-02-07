import React, { useState } from 'react';
import { LogOut, Banknote, ShieldCheck, ChevronLeft, QrCode } from 'lucide-react';
import { Employee, OrderStatus } from '../types';
import { historyApi, cashierApi, guardApi } from '../services/api';
import { Scanner as BarcodeScanner } from '../components/Scanner/Scanner';
import { SQL_ReceiptStatus } from '../../data/sqlDb';
import { qrParser } from '../services/qrParser';

type EmployeeMode = 'CASHIER' | 'GUARD';

interface EmployeeHomeProps {
    employee: Employee | null;
    onSelectMode: (mode: EmployeeMode) => void;
    onBack: () => void;
}

export const EmployeeHome: React.FC<EmployeeHomeProps> = ({ employee, onSelectMode, onBack }) => {
    if (!employee) return null;

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black">Dashboard</h1>
                    <p className="text-gray-400 text-sm">Welcome, {employee.name}</p>
                </div>
                <button onClick={onBack} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                    <LogOut size={20} className="text-gray-400" />
                </button>
            </div>

            <div className="grid gap-4">
                <button
                    onClick={() => onSelectMode('CASHIER')}
                    className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex items-center gap-4 hover:border-[#007041] hover:bg-gray-800/80 transition group"
                >
                    <div className="bg-[#007041] p-4 rounded-xl text-white shadow-lg group-hover:scale-110 transition">
                        <Banknote size={32} />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-lg">Cashier Mode</h3>
                        <p className="text-xs text-gray-400">Process payments for pending receipts</p>
                    </div>
                    <ChevronLeft size={24} className="rotate-180 text-gray-500 group-hover:text-white" />
                </button>

                <button
                    onClick={() => onSelectMode('GUARD')}
                    className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex items-center gap-4 hover:border-[#FFD200] hover:bg-gray-800/80 transition group"
                >
                    <div className="bg-[#FFD200] p-4 rounded-xl text-black shadow-lg group-hover:scale-110 transition">
                        <ShieldCheck size={32} />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-lg">Guard Mode</h3>
                        <p className="text-xs text-gray-400">Verify exit QR codes at the gate</p>
                    </div>
                    <ChevronLeft size={24} className="rotate-180 text-gray-500 group-hover:text-white" />
                </button>
            </div>

            <div className="mt-auto bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">System Status</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-900 p-3 rounded-lg">
                        <span className="block text-xl font-black text-white">Online</span>
                        <span className="text-[10px] text-gray-500">Database</span>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg">
                        <span className="block text-xl font-black text-[#007041]">v1.2</span>
                        <span className="text-[10px] text-gray-500">Version</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface EmployeeScannerProps {
    mode: EmployeeMode;
    onBack: () => void;
}

export const EmployeeScanner: React.FC<EmployeeScannerProps> = ({ mode, onBack }) => {
    // deleted unused scannedData state

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [receiptDetails, setReceiptDetails] = useState<SQL_ReceiptStatus | null>(null);
    const [currentOrderHash, setCurrentOrderHash] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleScan = async (code: string) => {
        if (processing) return;
        setProcessing(true);
        // setScannedData(code); // Unused
        setStatusMsg({ type: 'info', text: 'Validating QR...' });

        try {
            // 1. Robust JSON Parsing
            const payload = qrParser.parse(code);
            let lookupId = payload.orderHash;
            setCurrentOrderHash(payload.orderHash);

            // 2. Link Order ID to Receipt Number via local history simulation
            const localHistory = historyApi.getOrders();
            const order = localHistory.find(o => o.orderHash === payload.orderHash);

            if (order) {
                lookupId = order.receiptNumber;
            } else if (payload.orderHash.startsWith('OFFLINE-')) {
                lookupId = payload.orderHash.replace('OFFLINE-', '');
            }

            const receipt = await cashierApi.getReceiptStatus(lookupId);

            if (receipt) {
                setReceiptDetails(receipt);
                if (mode === 'CASHIER') {
                    if (receipt.payment_status === OrderStatus.PAID || receipt.payment_status === OrderStatus.VERIFIED) {
                        setStatusMsg({ type: 'success', text: 'Already Paid' });
                    } else {
                        setStatusMsg({ type: 'info', text: `Collect ₹${receipt.total_amount}` });
                    }
                } else {
                    // GUARD
                    if (receipt.payment_status === OrderStatus.PAID || receipt.payment_status === OrderStatus.VERIFIED) {
                        // 🛡️ Verify on Blockchain
                        const verification = await guardApi.verifyExit(payload.orderHash);

                        if (verification.success) {
                            setStatusMsg({ type: 'success', text: 'Verified: Allowed to Exit' });
                            // Sync local status
                            if (receipt.payment_status === OrderStatus.PAID) {
                                cashierApi.updatePaymentStatus(receipt.receipt_number, OrderStatus.VERIFIED);
                            }
                        } else {
                            setStatusMsg({ type: 'error', text: `Block: ${verification.status}` });
                        }
                    } else {
                        setStatusMsg({ type: 'error', text: 'Payment Pending! STOP.' });
                    }
                }
            } else {
                setStatusMsg({ type: 'error', text: 'Receipt Not Found' });
                setReceiptDetails(null);
                setCurrentOrderHash(null);
            }
        } catch (e) {
            setStatusMsg({ type: 'error', text: 'Scan Error' });
            setCurrentOrderHash(null);
        } finally {
            setProcessing(false);
        }
    };

    const markAsPaid = async () => {
        if (!receiptDetails) return;
        setProcessing(true);
        // Pass orderHash to trigger blockchain update
        const success = await cashierApi.updatePaymentStatus(receiptDetails.receipt_number, OrderStatus.PAID, currentOrderHash || undefined);
        if (success) {
            setReceiptDetails({ ...receiptDetails, payment_status: OrderStatus.PAID });
            setStatusMsg({ type: 'success', text: 'Payment Recorded' });
        } else {
            setStatusMsg({ type: 'error', text: 'Update Failed' });
        }
        setProcessing(false);
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            <div className="p-4 flex items-center justify-between bg-gray-800 shadow-md z-10">
                <button onClick={onBack} className="p-2 bg-gray-700 rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <div className="text-right">
                    <h2 className="font-bold text-lg">{mode === 'CASHIER' ? 'Cashier Terminal' : 'Security Gate'}</h2>
                    <p className="text-xs text-gray-400">Scan Customer QR</p>
                </div>
            </div>

            <div className="flex-1 relative flex flex-col">
                <div className="h-1/2 relative bg-black">
                    <BarcodeScanner onScan={handleScan} variant="square" />
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 px-4 py-1 rounded-full text-xs font-mono">
                        {processing ? 'Processing...' : 'Ready to Scan'}
                    </div>
                </div>

                <div className="flex-1 bg-gray-800 p-6 rounded-t-3xl -mt-6 z-20 shadow-2xl">
                    {statusMsg && (
                        <div className={`p-4 rounded-xl mb-6 text-center font-bold text-lg ${statusMsg.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                            statusMsg.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            }`}>
                            {statusMsg.text}
                        </div>
                    )}

                    {receiptDetails && (
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Receipt #</span>
                                <span className="font-mono">{receiptDetails.receipt_number}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Amount</span>
                                <span className="font-black text-xl">₹{receiptDetails.total_amount}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Status</span>
                                <span className={`font-bold ${receiptDetails.payment_status === 'PENDING' ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {receiptDetails.payment_status}
                                </span>
                            </div>

                            {mode === 'CASHIER' && receiptDetails.payment_status === 'PENDING' && (
                                <button
                                    onClick={markAsPaid}
                                    disabled={processing}
                                    className="w-full bg-[#007041] text-white py-4 rounded-xl font-bold text-lg hover:bg-green-800 transition shadow-lg mt-4"
                                >
                                    Confirm Cash Payment
                                </button>
                            )}

                            <button
                                onClick={() => { setReceiptDetails(null); setStatusMsg(null); setCurrentOrderHash(null); }}
                                className="w-full bg-gray-700 text-white py-3 rounded-xl font-bold mt-2"
                            >
                                Scan Next
                            </button>
                        </div>
                    )}

                    {!receiptDetails && !processing && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <QrCode size={48} className="mb-2" />
                            <p>Waiting for scan...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
