import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Order, OrderStatus, PaymentMethod } from '../types';
import { cashierApi } from '../services/api';
import { OrderQRCode } from '../components/OrderQRCode';

interface QRProps {
  currentOrder: Order | null;
  onFinish: () => void;
}

export const QR: React.FC<QRProps> = ({
  currentOrder,
  onFinish,
}) => {
  const [status, setStatus] = useState<OrderStatus>(currentOrder?.status || OrderStatus.PENDING);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showIntermediateSuccess, setShowIntermediateSuccess] = useState(false);

  // Fallback for simulation if txHash is missing (ensures QR renders in dev)
  const txHash = currentOrder?.txHash || (currentOrder?.orderHash ? `0x${currentOrder.orderHash.substring(0, 10)}...simulated` : undefined);

  useEffect(() => {
    // Simulate Blockchain Verification Delay for UX
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Determine if we should show the intermediate success screen
    // Only show if transitioning to PAID from CASH (Counter payment)
    const isCashPayment = currentOrder?.paymentMethod === PaymentMethod.CASH;

    if (status === OrderStatus.PAID) {
      if (isCashPayment) {
        setShowIntermediateSuccess(true);
        const timer = setTimeout(() => {
          setShowIntermediateSuccess(false);
        }, 5000);
        return () => clearTimeout(timer);
      } else {
        // For UPI/Card, no intermediate delay needed, go straight to Exit QR
        setShowIntermediateSuccess(false);
      }
    }
  }, [status, currentOrder]);

  useEffect(() => {
    // Poll until Verified (Handles both PENDING->PAID and PAID->VERIFIED)
    if (!currentOrder || status === OrderStatus.VERIFIED || isVerifying || showIntermediateSuccess) return;

    const pollStatus = async () => {
      try {
        const result = await cashierApi.getReceiptStatus(currentOrder.receiptNumber);
        if (result && result.payment_status && result.payment_status !== status) {
          setStatus(result.payment_status as OrderStatus);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [currentOrder, status, isVerifying, showIntermediateSuccess]);

  if (!currentOrder) return null;

  if (isVerifying) {
    return (
      <div className="h-full bg-[#007041] text-white p-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white text-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-pulse">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={48} className="text-[#007041] animate-bounce" />
          </div>
          <h2 className="text-2xl font-black mb-2">Verifying Payment</h2>
          <p className="text-gray-500 text-sm mb-6">Checking blockchain ledger for confirmation...</p>

          <div className="mt-8 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#007041]" />
            <span className="text-xs font-bold text-[#007041] uppercase tracking-widest">Syncing Nodes...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#007041] text-white p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-yellow-400 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white text-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 animate-in zoom-in duration-300">
        {/* Status Icon */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
          {status === OrderStatus.PAID || status === OrderStatus.VERIFIED ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Animated Circle Background */}
              <div className={`absolute inset-0 rounded-full animate-circle-pop ${status === OrderStatus.VERIFIED ? 'bg-green-100' : 'bg-yellow-100'}`}></div>

              {/* Checkmark SVG */}
              <svg className="w-12 h-12 relative z-10" viewBox="0 0 52 52">
                <path
                  className={`animate-check-draw fill-none stroke-[5px] stroke-current ${status === OrderStatus.VERIFIED ? 'text-green-600' : 'text-yellow-600'}`}
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
              <Loader2 size={32} className="animate-spin" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-black mb-1">
          {status === OrderStatus.PAID
            ? (showIntermediateSuccess ? 'Payment Completed' : 'Exit QR')
            : status === OrderStatus.VERIFIED
              ? 'EXIT VERIFIED'
              : 'Payment Pending'}
        </h1>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
          {currentOrder.receiptNumber}
        </p>

        {/* Blockchain trust badge */}
        {/* Blockchain trust badge - Hide in intermediate success to clean up UI */}
        {!showIntermediateSuccess && (
          <div className="flex items-center justify-center gap-2 text-green-700 text-xs font-semibold mb-4">
            <ShieldCheck size={14} />
            {status !== OrderStatus.PENDING ? 'Verified on Blockchain' : 'Blockchain Entry Pending'}
          </div>
        )}

        {/* QR SECTION */}
        {/* QR SECTION - Hide during intermediate success */}
        {!showIntermediateSuccess && (
          <div className={`bg-gray-50 p-6 rounded-2xl border-2 border-dashed mb-6 flex flex-col items-center justify-center transition-colors ${status === OrderStatus.PAID ? 'border-[#FFD200] bg-yellow-50/50' : 'border-gray-200'
            }`}>
            <OrderQRCode
              orderHash={currentOrder.orderHash}
              txHash={txHash}
              receiptNumber={currentOrder.receiptNumber}
              size={160}
            />

            <div className="mt-4 px-2">
              {status !== OrderStatus.PENDING ? (
                <div className="space-y-2">
                  <p className={`text-sm font-black leading-tight ${status === OrderStatus.PAID ? 'text-yellow-800' : 'text-gray-900'}`}>
                    {status === OrderStatus.VERIFIED ? 'EXIT COMPLETED' : 'SCAN THIS AT THE GATE'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {status === OrderStatus.VERIFIED
                      ? 'Your exit has been verified. Thank you for shopping!'
                      : 'Scan this receipt QR (recorded in past orders) at the gate for verified exit.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-black text-gray-900 leading-tight">
                    PAYMENT COUNTER
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium text-center max-w-[200px]">
                    Scan this QR at the payment counter to complete your purchase.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className={`flex justify-between items-center text-sm border-t border-gray-100 pt-4 mb-2 ${showIntermediateSuccess ? 'mt-8' : ''}`}>
          <span className="text-gray-500">Amount Paid</span>
          <span className="font-black text-lg">
            ₹{currentOrder.totalAmount.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm mb-4">
          <span className="text-gray-500">Items</span>
          <span className="font-bold">{currentOrder.items.length}</span>
        </div>

        <button
          onClick={onFinish}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold shadow hover:bg-black transition"
        >
          {status !== OrderStatus.PENDING ? 'Done & Exit' : 'Done'}
        </button>
      </div>

      <p className="mt-8 text-green-200 text-xs font-medium max-w-xs leading-relaxed">
        {status !== OrderStatus.PENDING
          ? (status === OrderStatus.VERIFIED ? 'Exit verified. Have a nice day!' : 'Your exit verification is ready. Please proceed to the gate.')
          : 'A copy of this receipt has been saved to your history.'}
      </p>
    </div>
  );
};
