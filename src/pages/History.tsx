import React, { useState, useEffect } from 'react';
import { OrderQRCode } from '../components/OrderQRCode';
import { Receipt, ChevronLeft, Smartphone, CreditCard, Banknote, QrCode } from 'lucide-react';
import { historyApi } from '../services/api';
import { Order } from '../types';

interface HistoryProps {
    onBack: () => void;
}

export const History: React.FC<HistoryProps> = ({ onBack }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    useEffect(() => {
        setOrders(historyApi.getOrders());
    }, []);

    const toggleOrderDetails = (orderId: string) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-black text-gray-800">Past Orders</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center text-gray-400 mt-20">
                        <Receipt size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">No orders yet</p>
                        <p className="text-xs mt-1">Your shopping history will appear here</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Order Header */}
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="font-black text-gray-800 text-lg">₹{order.totalAmount.toFixed(2)}</div>
                                        <div className="text-xs text-gray-400">{new Date(order.timestamp).toLocaleDateString()} • {new Date(order.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'PAID' || order.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1 font-medium">{order.storeName}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <Receipt size={12} /> {order.receiptNumber}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleOrderDetails(order.id)}
                                        className="flex items-center gap-1 text-xs font-bold text-[#007041] hover:bg-green-50 px-2 py-1 rounded-lg transition"
                                    >
                                        {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                                        <ChevronLeft size={14} className={`transform transition-transform ${expandedOrder === order.id ? 'rotate-90' : '-rotate-90'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Order Details */}
                            {expandedOrder === order.id && (
                                <div className="border-t border-gray-100 bg-gray-50">
                                    <div className="p-5 space-y-4">
                                        {/* Items List */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Items Purchased ({order.items.length})</h4>
                                            <div className="space-y-2">
                                                {order.items.map((item, index) => (
                                                    <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                                                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-gray-800 truncate">{item.name}</p>
                                                            <p className="text-xs text-gray-500">{item.brand} • {item.weight}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs font-bold text-[#007041]">₹{item.price}</span>
                                                                {item.discount > 0 && (
                                                                    <span className="text-xs text-gray-400 line-through">₹{item.mrp}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                                            <p className="font-bold text-sm text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Payment & Receipt Details */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Payment</h5>
                                                <div className="flex items-center gap-2">
                                                    {order.paymentMethod === 'UPI' && <Smartphone size={16} className="text-blue-600" />}
                                                    {order.paymentMethod === 'CARD' && <CreditCard size={16} className="text-purple-600" />}
                                                    {order.paymentMethod === 'CASH' && <Banknote size={16} className="text-green-600" />}
                                                    <span className="text-sm font-bold text-gray-800">{order.paymentMethod}</span>
                                                </div>
                                                {order.totalDiscount > 0 && (
                                                    <p className="text-xs text-green-600 mt-1">Saved ₹{order.totalDiscount.toFixed(2)}</p>
                                                )}
                                            </div>

                                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Receipt QR</h5>
                                                <div className="flex items-center justify-center">
                                                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                        <OrderQRCode
                                                            orderHash={order.orderHash}
                                                            txHash={order.txHash}
                                                            receiptNumber={order.receiptNumber}
                                                            size={60}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Full Receipt Button */}
                                        <button
                                            onClick={() => {
                                                // Create a detailed receipt view
                                                const receiptData = {
                                                    ...order,
                                                    ...order,
                                                    // qrCode: order.qrPayload // Removed invalid property
                                                };
                                                console.log('Full Receipt:', receiptData);
                                                // You could open a modal or navigate to a full receipt view here
                                            }}
                                            className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-700 transition flex items-center justify-center gap-2"
                                        >
                                            <QrCode size={16} />
                                            View Full Receipt
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
