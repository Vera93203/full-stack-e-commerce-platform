/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Storefront from './components/Storefront.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { CartItem, Order } from './types.ts';

export default function App() {
  // Navigation swapping: 'storefront' vs 'admin'
  const [currentView, setCurrentView] = useState<'storefront' | 'admin'>('storefront');

  // Unified shopping bag cart (persisted in localStorage + dynamic sync)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('sovereign_cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Share historical orders list
  const [orders, setOrders] = useState<Order[]>([]);

  // Persistent cart save
  useEffect(() => {
    localStorage.setItem('sovereign_cart', JSON.stringify(cart));
  }, [cart]);

  // Read initial recent customer orders
  const refreshCustomerOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error('Failed to sync general invoices:', e);
    }
  };

  useEffect(() => {
    refreshCustomerOrders();
  }, []);

  const handleOrderCompleted = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
  };

  return (
    <div className="w-full min-h-screen">
      {currentView === 'storefront' ? (
        <Storefront
          onNavigateToAdmin={() => setCurrentView('admin')}
          cart={cart}
          setCart={setCart}
          orders={orders}
          onOrderCompleted={handleOrderCompleted}
        />
      ) : (
        <AdminPanel
          onNavigateToShop={() => setCurrentView('storefront')}
          orders={orders}
          setOrders={setOrders}
        />
      )}
    </div>
  );
}
