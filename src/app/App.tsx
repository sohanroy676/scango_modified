
import React, { useState, useRef, useCallback } from 'react';
import { Product, CartItem, PaymentMethod, Order, User, Store, Screen } from '../types';
import { Employee } from '../types';
import { checkoutApi } from '../services/api';
import { productApi as prodService } from '../services/product.service';
import { Login } from '../pages/Login';
import { StoreSelect } from '../pages/StoreSelect';
import { Home } from '../pages/Home';
import { Scan } from '../pages/Scan';
import { Cart } from '../pages/Cart';
import { Checkout } from '../pages/Checkout';
import { QR } from '../pages/QR';
import { History } from '../pages/History';
import { EmployeeHome, EmployeeScanner } from '../pages/Employee';
import SystemArchitecture from '../components/SystemArchitecture';
import { ChevronLeft } from 'lucide-react';
import { ChatInterface } from '../components/Chat/ChatInterface';

const App: React.FC = () => {
   // --- STATE MANAGEMENT ---
   const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');

   // User & Store
   const [user, setUser] = useState<User | null>(null);
   const [selectedStore, setSelectedStore] = useState<Store | null>(null);

   // Shopping Cart & Scanner
   const [cart, setCart] = useState<CartItem[]>([]);
   const [lastScanned, setLastScanned] = useState<Product | null>(null);
   const [scanQuantity, setScanQuantity] = useState<number>(1);
   const [isProcessing, setIsProcessing] = useState(false);
   const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [manualInput, setManualInput] = useState('');

   // Employee Mode
   const [employeeMode, setEmployeeMode] = useState<'CASHIER' | 'GUARD'>('CASHIER');
   const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);

   const lastScanTime = useRef<number>(0);

   // --- HANDLERS ---

   const addToCart = useCallback((product: Product, quantity: number) => {
      setCart(prev => {
         const existing = prev.find(item => item.id === product.id);
         if (existing) {
            return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
         }
         return [...prev, { ...product, quantity: quantity }];
      });
      setLastScanned(null);
      setScanQuantity(1);
   }, []);

   const updateQuantity = useCallback((id: string, delta: number) => {
      setCart(prev => prev.map(item => {
         if (item.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
         }
         return item;
      }).filter(item => item.quantity > 0));
   }, []);

   const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
   const totalSavings = cart.reduce((acc, item) => acc + ((item.mrp - item.price) * item.quantity), 0);

   const handleScan = useCallback(async (barcode: string) => {
      const now = Date.now();
      if (now - lastScanTime.current < 2500) return;

      if (!selectedStore) {
         setError("Please select a store first.");
         return;
      }

      lastScanTime.current = now;
      setIsProcessing(true);
      setError(null);
      try {
         const product = await prodService.fetchByBarcode(barcode, selectedStore.id);
         if (product) {
            setLastScanned(product);
            setScanQuantity(1);
         } else {
            setError(`Not Found: [${barcode}]`);
            setTimeout(() => setError(null), 3000);
         }
      } catch (err) {
         setError("Syncing Error...");
      } finally {
         setIsProcessing(false);
      }
   }, [selectedStore]);

   const handleCheckout = useCallback(async (method: PaymentMethod) => {
      if (!selectedStore) return;
      setIsProcessing(true);
      setError(null);
      try {
         const order = await checkoutApi.createOrder(cart, method, selectedStore.name, user?.walletAddress);
         setCurrentOrder(order);
         setCurrentScreen('SUCCESS');
      } catch (err) {
         setError("Payment Processing Error.");
      } finally {
         setIsProcessing(false);
      }
   }, [cart, selectedStore]);

   const handleStoreSelect = useCallback((s: Store) => {
      setSelectedStore(s);
      setCart([]); // Reset cart on store switch
      setCurrentScreen('HOME');
   }, []);

   const handleLoginSuccess = (phone: string, name: string) => {
      // For demo, we assign a fixed wallet or one based on phone
      // Let's use the one that holds some rewards for testing or a consistent one
      // In production, this comes from DB
      const demoWallet = "0x66c668f8953785dc8e17C8A4d884cb0FD7D6A520"; // Key-less public address for demo

      setUser({
         id: `user-${phone}`,
         phoneNumber: phone,
         name: name,
         walletAddress: demoWallet
      });
      setCurrentScreen('STORE_SELECT');
   };

   // --- RENDER ---
   return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen shadow-2xl relative overflow-hidden font-sans">

         {/* Global Chat Interface - Conditional Render */}
         {selectedStore && !['LOGIN', 'EMPLOYEE_LOGIN', 'EMPLOYEE_HOME', 'EMPLOYEE_ACTION'].includes(currentScreen) && (
            <ChatInterface store={selectedStore} />
         )}

         {currentScreen === 'LOGIN' && (
            <Login
               onCustomerLogin={handleLoginSuccess}
               onEmployeeLogin={(emp) => {
                  setLoggedInEmployee(emp);
                  setCurrentScreen('EMPLOYEE_HOME');
               }}
            />
         )}

         {currentScreen === 'STORE_SELECT' && (
            <StoreSelect
               onSelectStore={handleStoreSelect}
               onError={setError}
               setProcessing={setIsProcessing}
               isProcessing={isProcessing}
            />
         )}

         {currentScreen === 'HOME' && (
            <Home
               user={user}
               store={selectedStore}
               onChangeScreen={setCurrentScreen}
               onLogout={() => { setSelectedStore(null); setCurrentScreen('STORE_SELECT'); }}
            />
         )}

         {currentScreen === 'HISTORY' && (
            <History onBack={() => setCurrentScreen('HOME')} />
         )}

         {currentScreen === 'SCANNER' && (
            <Scan
               store={selectedStore}
               onScreenChange={setCurrentScreen}
               onScan={handleScan}
               manualInput={manualInput}
               setManualInput={setManualInput}
               isProcessing={isProcessing}
               lastScanned={lastScanned}
               setLastScanned={setLastScanned}
               scanQuantity={scanQuantity}
               setScanQuantity={setScanQuantity}
               addToCart={addToCart}
               cart={cart}
               error={error}
               totalAmount={totalAmount}
            />
         )}

         {currentScreen === 'CART' && (
            <Cart
               cart={cart}
               updateQuantity={updateQuantity}
               onScreenChange={setCurrentScreen}
               totalAmount={totalAmount}
               totalSavings={totalSavings}
            />
         )}

         {currentScreen === 'PAYMENT' && (
            <Checkout
               onScreenChange={setCurrentScreen}
               totalAmount={totalAmount}
               handleCheckout={handleCheckout}
               isProcessing={isProcessing}
            />
         )}

         {currentScreen === 'SUCCESS' && ( // Mapped to QR Page
            <QR
               currentOrder={currentOrder}
               onFinish={() => { setCurrentOrder(null); setCart([]); setCurrentScreen('HOME'); }}
            />
         )}

         {currentScreen === 'EMPLOYEE_LOGIN' && (
            <Login
               onCustomerLogin={handleLoginSuccess}
               onEmployeeLogin={(emp) => {
                  setLoggedInEmployee(emp);
                  setCurrentScreen('EMPLOYEE_HOME');
               }}
            />
         )}

         {currentScreen === 'EMPLOYEE_HOME' && (
            <EmployeeHome
               employee={loggedInEmployee}
               onSelectMode={(mode) => {
                  setEmployeeMode(mode);
                  setCurrentScreen('EMPLOYEE_ACTION');
               }}
               onBack={() => {
                  setLoggedInEmployee(null);
                  setCurrentScreen('LOGIN');
               }}
            />
         )}

         {currentScreen === 'EMPLOYEE_ACTION' && (
            <EmployeeScanner
               mode={employeeMode}
               onBack={() => setCurrentScreen('EMPLOYEE_HOME')}
            />
         )}

         {currentScreen === 'DOCS' && (
            <div className="p-6 h-screen overflow-y-auto bg-white">
               <button onClick={() => setCurrentScreen('HOME')} className="mb-4 text-xs font-black uppercase flex items-center gap-2 text-gray-400 tracking-widest">
                  <ChevronLeft size={16} /> Exit System Docs
               </button>
               <SystemArchitecture />
            </div>
         )}
      </div>
   );
};

export default App;