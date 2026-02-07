export interface Counter {
    id: string;
    number: number;
    queueSize: number;
    isActive: boolean;
}

export interface User {
    id: string;
    phoneNumber: string;
    name?: string;
    walletAddress?: string; // For blockchain rewards
    rewardBalance?: number; // DB-backed balance
}

export interface Employee {
    id: string;
    name: string;
    role: 'CASHIER' | 'GUARD';
}

export interface Store {
    id: string;
    name: string;
    address: string;
    location: {
        lat: number;
        lng: number;
    };
}

// Added LOGIN to Screen types
export type Screen = 'LOGIN' | 'STORE_SELECT' | 'HOME' | 'SCANNER' | 'CART' | 'PAYMENT' | 'SUCCESS' | 'HISTORY' | 'EMPLOYEE_LOGIN' | 'EMPLOYEE_HOME' | 'EMPLOYEE_ACTION' | 'DOCS';

export * from './product';
export * from './order';
