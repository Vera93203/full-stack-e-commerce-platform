/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, Package, 
  Trash2, Edit3, Plus, ArrowLeft, Download, RefreshCw, 
  ExternalLink, FileText, CheckCircle, Truck, HelpCircle, 
  X, Check, RotateCcw, Sparkles
} from 'lucide-react';
import { Product, Order, AdminAnalytics, OrderStatus } from '../types.ts';

interface AdminPanelProps {
  onNavigateToShop: () => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

export default function AdminPanel({
  onNavigateToShop,
  orders,
  setOrders
}: AdminPanelProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Products state matching DB
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Form Editor Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Bulk select lists
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Sub tab tracking
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'products' | 'orders' | 'analytics'>('dashboard');

  // Alert/Notifications
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Load backend states
  const refreshAdminData = async () => {
    setLoading(true);
    try {
      // 1. Analytics
      const analRes = await fetch('/api/analytics');
      if (analRes.ok) {
        const analData = await analRes.json();
        setAnalytics(analData);
      }

      // 2. Orders List
      const orderRes = await fetch('/api/orders');
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData);
      }

      // 3. Products List
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProductsList(prodData);
      }
    } catch (e) {
      console.error('Error syncing admin console:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAdminData();
  }, []);

  const triggerAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (productsList.length === 0) return;
    const headers = ['ID', 'Title', 'Category', 'Price', 'Stock', 'Rating'];
    const rows = productsList.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.category,
      p.price,
      p.stock,
      p.rating
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sovereign_catalog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert('Product Catalog CSV database exported!');
  };

  // CRUD Product save
  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.title || editingProduct?.price === undefined || editingProduct?.stock === undefined) {
      triggerAlert('Please complete price, title and inventory fields');
      return;
    }

    setIsSavingProduct(true);
    try {
      const isNew = !editingProduct.id;
      const url = isNew ? '/api/products' : `/api/products/${editingProduct.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct)
      });

      if (res.ok) {
        triggerAlert(isNew ? 'Added new object to collection' : 'Reprofiled object specifications');
        setEditingProduct(null);
        await refreshAdminData();
      } else {
        triggerAlert('Error saving product structure');
      }
    } catch (err) {
      triggerAlert('Server transmission error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Image Upload base64 reader
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setEditingProduct(prev => ({
        ...prev,
        image: reader.result as string,
        images: prev?.images ? [...prev.images, reader.result as string] : [reader.result as string]
      }));
      triggerAlert('Image queued for S3 upload syncing');
    };
    reader.readAsDataURL(file);
  };

  // Update order status
  const transitionOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        triggerAlert(`Order status transit to "${nextStatus}" successful`);
        await refreshAdminData();
      }
    } catch (err) {
      triggerAlert('Status transition failed');
    }
  };

  // Stripe refund trigger
  const triggerRefund = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to trigger a full refund? This will restock items and reverse the Stripe Payment Intent.')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST'
      });
      if (res.ok) {
        triggerAlert('Stripe charge reversed and items restocked');
        await refreshAdminData();
      }
    } catch (err) {
      triggerAlert('Refund operation failed');
    }
  };

  // Bulk actions
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to remove these ${selectedProductIds.length} objects from the collection?`)) return;

    try {
      await Promise.all(selectedProductIds.map(id => 
        fetch(`/api/products/${id}`, { method: 'DELETE' })
      ));
      setSelectedProductIds([]);
      triggerAlert('Bulk catalog items deleted successfully');
      await refreshAdminData();
    } catch (e) {
      triggerAlert('Error during bulk destruction');
    }
  };

  const handleBulkInventoryRestock = async () => {
    if (selectedProductIds.length === 0) return;
    try {
      await Promise.all(selectedProductIds.map(async id => {
        const prod = productsList.find(p => p.id === id);
        if (prod) {
          await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: prod.stock + 20 })
          });
        }
      }));
      setSelectedProductIds([]);
      triggerAlert('Restocked +20 units to bulk selected objects');
      await refreshAdminData();
    } catch (e) {
      triggerAlert('Inventory adjustment failure');
    }
  };

  const handleDeleteSingleProduct = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerAlert('Product removed from active catalog');
        await refreshAdminData();
      }
    } catch (e) {
      triggerAlert('Deletion check error');
    }
  };

  // Filter local listings
  const filteredProducts = productsList.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="admin-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans tracking-normal flex flex-col">
      
      {/* Alert banner */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-indigo-600 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-indigo-500/30 flex items-center gap-3 text-sm font-semibold"
          >
            <Sparkles className="h-4.5 w-4.5 text-white" />
            <span>{alertMsg ?? ''}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP DECK NAV */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={onNavigateToShop}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Storefront
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <span className="text-sm font-bold tracking-wider text-indigo-400 uppercase select-none">
              SOVEREIGN LEDGER CONSOLE v2.1
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshAdminData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/65"
              title="Hot Refresh Ledgers"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* SIDE BAR NAVIGATION */}
        <div className="lg:col-span-1 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-3 mb-3 font-mono">Consoles</span>
          
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-3 text-xs ${activeSubTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <TrendingUp className="h-4 w-4" />
            Executive Summary
          </button>
          <button
            onClick={() => setActiveSubTab('products')}
            className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-3 text-xs ${activeSubTab === 'products' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <Package className="h-4 w-4" />
            Objects Catalog
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-3 text-xs ${activeSubTab === 'orders' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <ShoppingBag className="h-4 w-4" />
            Orders &amp; Refunds
            {orders.length > 0 && (
              <span className="ml-auto bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {orders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-3 text-xs ${activeSubTab === 'analytics' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <Users className="h-4 w-4" />
            Funnel metrics
          </button>
        </div>

        {/* VIEW AREA */}
        <div className="lg:col-span-4 space-y-8">
          
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map(x => (
                  <div key={x} className="h-28 bg-slate-900 rounded-2xl" />
                ))}
              </div>
              <div className="h-96 bg-slate-900 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* METRICS HEADER CARDS */}
              {activeSubTab === 'dashboard' && analytics && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest font-mono">Gross Revenue</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-slate-100">${analytics.totalRevenue.toLocaleString()}</span>
                        <span className="text-emerald-500 text-[10px] font-bold">+$12%</span>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest font-mono">Transactions</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-slate-100">{analytics.orderCount}</span>
                        <span className="text-teal-400 text-[10px] font-bold">Recent</span>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest font-mono">Average Order</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-slate-100">${Math.round(analytics.averageOrderValue)}</span>
                        <span className="text-indigo-400 text-[10px] font-bold">Stable</span>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest font-mono">CR Ratio</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-slate-100">{analytics.conversionRate}%</span>
                        <span className="text-amber-500 text-[10px] font-bold">Top Tier</span>
                      </div>
                    </div>
                  </div>

                  {/* CUSTOM DRAWN STUNNING SVG REVENUE GRAPH */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm">Revenue Flow Trend</h3>
                      <span className="text-xs text-slate-500">Hourly aggregates synced from memory database</span>
                    </div>

                    <div className="h-64 relative w-full pt-4">
                      {analytics.salesHistory && analytics.salesHistory.length > 0 ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeDasharray="3 3" />
                          <line x1="0" y1="100" x2="500" y2="100" stroke="#1e293b" strokeDasharray="3 3" />
                          <line x1="0" y1="150" x2="500" y2="150" stroke="#1e293b" strokeDasharray="3 3" />

                          {/* Generated Path lines based on real sales data */}
                          {(() => {
                            const padding = 20;
                            const height = 160;
                            const maxVal = Math.max(...analytics.salesHistory.map(d => d.revenue), 500) || 1000;
                            const points = analytics.salesHistory.map((d, i) => {
                              const x = (i / (analytics.salesHistory.length - 1)) * 500;
                              const y = 200 - padding - (d.revenue / maxVal) * height;
                              return { x, y, ...d };
                            });

                            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaPath = `${linePath} L 500 ${200 - padding} L 0 ${200 - padding} Z`;

                            return (
                              <>
                                {/* Colored area */}
                                <path d={areaPath} fill="url(#chartGradient)" />
                                {/* Bold line */}
                                <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" />

                                {/* Glowing nodes */}
                                {points.map((p, idx) => (
                                  <g key={idx}>
                                    <circle 
                                      cx={p.x} 
                                      cy={p.y} 
                                      r="4" 
                                      fill="#6366f1" 
                                      stroke="#0f172a" 
                                      strokeWidth="2" 
                                      className="cursor-pointer hover:r-6 transition-all"
                                    />
                                    {/* Small custom SVG hovering text labels */}
                                    <text 
                                      x={p.x} 
                                      y={p.y - 10} 
                                      textAnchor="middle" 
                                      fill="#94a3b8" 
                                      fontSize="8 font-semibold"
                                      className="font-mono text-[8px]"
                                    >
                                      ${p.revenue}
                                    </text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">Waiting for sales ledger signals...</div>
                      )}
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 px-1 border-t border-slate-800/80 pt-3">
                      {analytics.salesHistory.map((d, i) => (
                        <span key={i} className="font-medium">{d.date}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TOP PRODS CARD */}
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <h3 className="font-bold text-slate-200 text-sm">Top Velocity Objects</h3>
                      <div className="space-y-4">
                        {analytics.topProducts.slice(0, 3).map((p, idx) => (
                          <div key={p.id} className="flex gap-4 items-center">
                            <span className="font-mono text-xs font-bold text-slate-600">0{idx+1}</span>
                            <img src={p.image} alt={p.title} className="h-10 w-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-200 truncate">{p.title}</h4>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{p.salesCount} modules registered</span>
                            </div>
                            <span className="text-xs font-bold text-indigo-400">${p.revenue}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Funnel overview widget */}
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <h3 className="font-bold text-slate-200 text-sm">System Conversion Funnel</h3>
                      <div className="space-y-3">
                        {analytics.funnel.map((fn, idx) => {
                          const widths = ['w-full', 'w-3/4', 'w-1/2', 'w-1/4'];
                          const opacities = ['opacity-90', 'opacity-80', 'opacity-70', 'opacity-60'];

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-medium text-slate-400">
                                <span>{fn.stage}</span>
                                <span className="font-semibold text-slate-200">{fn.count} ({fn.percentage}%)</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <span className={`h-full bg-indigo-500 rounded-full block ${widths[idx]} ${opacities[idx]}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRODUCTS CRUD CONSOLE */}
              {activeSubTab === 'products' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                      <input 
                        type="text" 
                        placeholder="Filter database, category, sku..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-200 w-full md:w-64"
                      />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-slate-950 border border-slate-800.60 text-slate-300 text-xs px-3.5 py-2.5 rounded-xl cursor-pointer"
                      >
                        <option value="All">All Sectors</option>
                        <option value="Audio">Audio</option>
                        <option value="Lifestyle">Lifestyle</option>
                        <option value="Computing">Computing</option>
                        <option value="Apparel">Apparel</option>
                      </select>
                    </div>

                    <div className="flex gap-2.5 w-full md:w-auto justify-end">
                      {selectedProductIds.length > 0 && (
                        <div className="flex gap-2 mr-2">
                          <button 
                            onClick={handleBulkInventoryRestock}
                            className="px-3.5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-indigo-500/30"
                          >
                            Restock +20
                          </button>
                          <button 
                            onClick={handleBulkDelete}
                            className="px-3.5 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-500/30 flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete ({selectedProductIds.length})
                          </button>
                        </div>
                      )}

                      <button 
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700/60 flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                      </button>
                      <button 
                        onClick={() => setEditingProduct({})}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Refile Object
                      </button>
                    </div>
                  </div>

                  {/* VIRTUALIZED TABLE SKELETON */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono">
                          <th className="py-4 px-5 text-center w-12">
                            <input 
                              type="checkbox" 
                              checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds(filteredProducts.map(p => p.id));
                                } else {
                                  setSelectedProductIds([]);
                                }
                              }}
                              className="rounded border-slate-800 bg-slate-950 text-indigo-600"
                            />
                          </th>
                          <th className="py-4 px-4 font-normal">Ident / Item</th>
                          <th className="py-4 px-4 font-normal">Sector</th>
                          <th className="py-4 px-4 font-normal text-right">Pricing</th>
                          <th className="py-4 px-4 font-normal text-center">In Stock</th>
                          <th className="py-4 px-4 font-normal text-center">Quality</th>
                          <th className="py-4 px-5 text-right font-normal">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="py-3 px-5 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedProductIds.includes(p.id)}
                                onChange={() => toggleSelectProduct(p.id)}
                                className="rounded border-slate-800 bg-slate-950 text-indigo-600"
                              />
                            </td>
                            <td className="py-3 px-4 flex items-center gap-3">
                              <img src={p.image} alt={p.title} className="h-9 w-9 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-200 truncate block">{p.title}</span>
                                <span className="text-[9px] text-slate-500 font-mono uppercase block mt-0.5">UUID: {p.id}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 bg-slate-850 border border-slate-800 rounded-lg text-slate-400 font-medium">{p.category}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-extrabold text-slate-100">${p.price}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-mono text-xs font-bold ${p.stock <= 5 ? 'text-amber-500 font-bold' : 'text-slate-300'}`}>{p.stock} units</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-bold text-slate-300">{p.rating} ⭐</span>
                            </td>
                            <td className="py-3 px-5 text-right space-x-1.5">
                              <button 
                                onClick={() => setEditingProduct(p)}
                                className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-all"
                                title="Reprofile specsheets"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteSingleProduct(p.id)}
                                className="p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-all"
                                title="Bulk off list"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ORDERS CONTROL LEDGER */}
              {activeSubTab === 'orders' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <h3 className="font-bold text-slate-200 text-sm">Active Merchant Ledger</h3>
                    <span className="text-xs text-slate-500">Manual status transitions, ship notes, and Stripe reversed refund triggers</span>
                  </div>

                  <div className="space-y-4">
                    {orders.length === 0 ? (
                      <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800 p-8">
                        <ShoppingBag className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                        <h4 className="text-slate-300 font-semibold text-xs">No customer invoices triggered</h4>
                      </div>
                    ) : (
                      orders.map((or) => {
                        const statusColors = {
                          processing: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                          shipped: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                          delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          refunded: 'bg-red-500/10 text-red-500 border-red-500/20'
                        };

                        return (
                          <div key={or.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
                            <div className="flex flex-col md:flex-row justify-between pb-4 border-b border-slate-800 gap-4">
                              <div className="space-y-1">
                                <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-wider block">LEDGER ENTRY: {or.id}</span>
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  <span className="font-extrabold text-slate-300">Total charge: ${or.total}</span>
                                  <span className="text-slate-700">•</span>
                                  <span className="text-slate-400 font-medium">{new Date(or.createdAt).toLocaleString()}</span>
                                  <span className="text-slate-700">•</span>
                                  <span className="text-[10px] text-indigo-400 font-mono truncate max-w-[120px]" title={or.stripePaymentIntentId}>
                                    INTENT ID: {or.stripePaymentIntentId}
                                  </span>
                                </div>
                              </div>

                              <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border self-start md:self-center ${statusColors[or.status]}`}>
                                {or.status}
                              </span>
                            </div>

                            {/* Inventory recap */}
                            <div className="space-y-3.5">
                              {or.items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 items-center text-xs">
                                  <img src={item.product.image} alt={item.product.title} className="h-10 w-10 rounded-lg object-cover bg-slate-950" referrerPolicy="no-referrer" />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-200 truncate">{item.product.title}</h4>
                                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Quantity: {item.quantity} | Finish: {item.color || 'Standard'} | Sizing: {item.size || 'Standard'}</span>
                                  </div>
                                  <span className="font-mono font-bold text-slate-400">${item.product.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>

                            {/* Dispatch notes */}
                            <div className="bg-slate-950 p-4 rounded-xl text-xs border border-slate-800 flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase text-slate-500 font-bold block tracking-wider">Logistics Dispatch To</span>
                                <h5 className="font-extrabold text-slate-300">{or.customerName}</h5>
                                <span className="text-slate-500 block">{or.customerEmail}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase text-slate-500 font-bold block tracking-wider">Delivery coordinate Address</span>
                                <span className="text-slate-400 block font-medium leading-tight">{or.shippingAddress.line1}, {or.shippingAddress.city}, {or.shippingAddress.postalCode}</span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                                {or.status === 'processing' && (
                                  <button 
                                    onClick={() => transitionOrderStatus(or.id, 'shipped')}
                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1 hover:scale-102"
                                  >
                                    <Truck className="h-3.5 w-3.5" />
                                    Launch Shipments
                                  </button>
                                )}
                                {or.status === 'shipped' && (
                                  <button 
                                    onClick={() => transitionOrderStatus(or.id, 'delivered')}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1 hover:scale-102"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Mark Handed Over
                                  </button>
                                )}
                                {or.status !== 'refunded' && (
                                  <button 
                                    onClick={() => triggerRefund(or.id)}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-red-900 border border-slate-700/60 text-slate-400 hover:text-white rounded-xl font-bold flex items-center gap-1"
                                    title="Process entire Stripe reverse capture transaction values"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Refund Charges
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ANALYTICS REPORT TAB */}
              {activeSubTab === 'analytics' && analytics && (
                <div className="space-y-8">
                  {/* Category share breakdown in gorgeous grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <h3 className="font-bold text-slate-200 text-sm">Sector Share breakdown</h3>
                      <div className="space-y-4">
                        {analytics.categoryDistribution.map((ct) => {
                          const maxVal = Math.max(...analytics.categoryDistribution.map(c => c.value), 1) || 1;
                          const widthPct = Math.round((ct.value / maxVal) * 100);

                          return (
                            <div key={ct.name} className="space-y-1">
                              <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
                                <span>{ct.name} Collection</span>
                                <span className="text-slate-200">${ct.value.toLocaleString()}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                                <span 
                                  style={{ width: `${widthPct}%`, backgroundColor: ct.color }} 
                                  className="h-full block rounded-full" 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-200 text-sm">AOV Analysis & performance</h3>
                        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-light">
                          Average order values represent core customer appetite logs. Consistently maintained value above $150 signals strong bundle incentive metrics.
                        </p>
                      </div>

                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2 mt-4">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>AOV Average value:</span>
                          <strong className="text-slate-200">${Math.round(analytics.averageOrderValue)}</strong>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Checkout completions:</span>
                          <strong className="text-indigo-400">{analytics.orderCount} cycles</strong>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Total turnover aggregated:</span>
                          <strong className="text-emerald-400">${analytics.totalRevenue.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* COMPACT PRODUCT FORM editor drawer */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xxs"
            />

            {/* Slider container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
                <h3 className="font-bold text-slate-200 text-sm">
                  {editingProduct.id ? 'Reprofile specsheets: ' + editingProduct.title : 'Refile new object'}
                </h3>
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-500 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content body */}
              <form onSubmit={handleSaveProductSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Image upload widget mimicking S3 */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">AWS S3 Product Portrait</label>
                  
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 min-w-20 rounded-xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center relative group">
                      {editingProduct.image ? (
                        <img src={editingProduct.image} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-slate-700" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="prod-img-upload" 
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <label 
                        htmlFor="prod-img-upload"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer inline-block transition-all border border-slate-700/60"
                      >
                        Upload to S3
                      </label>
                      <p className="text-[10px] text-slate-500">Auto webp compression, CDN static serving active</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block uppercase font-bold mb-1.5">Object Title <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingProduct.title || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Aura Wireless Stand"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold mb-1.5">Catalog price ($) <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        required
                        value={editingProduct.price || ''}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder="199"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold mb-1.5">Store Stock <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        required
                        value={editingProduct.stock === undefined ? '' : editingProduct.stock}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                        placeholder="25"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold mb-1.5">Sector Category</label>
                      <select
                        value={editingProduct.category || 'Lifestyle'}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3.5 py-2.5 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Audio">Audio</option>
                        <option value="Lifestyle">Lifestyle</option>
                        <option value="Computing">Computing</option>
                        <option value="Apparel">Apparel</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold mb-1.5">Custom Rating</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="1"
                        max="5"
                        value={editingProduct.rating || 4.5}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, rating: parseFloat(e.target.value) || 4.5 }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block uppercase font-bold mb-1.5">Product Narrative Synopsis</label>
                    <textarea 
                      rows={3}
                      value={editingProduct.description || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Provide descriptive background notes about craft materials, acoustic specs, or finishing details..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed font-light"
                    />
                  </div>

                  {/* Sizing array selectors */}
                  <div>
                    <label className="text-[10px] text-slate-500 block uppercase font-bold mb-2">Available sizes / structural layout variants</label>
                    <div className="flex flex-wrap gap-2">
                      {['Standard', '75% Layout', '100% Full', 'S', 'M', 'L', 'XL', 'Compact', 'Triple Node'].map(sz => {
                        const currentSizes = editingProduct.sizes || ['Standard'];
                        const isSelected = currentSizes.includes(sz);

                        return (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => {
                              const next = isSelected 
                                ? currentSizes.filter(x => x !== sz) 
                                : [...currentSizes, sz];
                              setEditingProduct(prev => ({ ...prev, sizes: next.length > 0 ? next : ['Standard'] }));
                            }}
                            className={`px-3 py-1.5 border text-[11px] font-bold rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-750'}`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </form>

              {/* SAVE / UPDATE DECK */}
              <div className="p-5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4">
                <div className="flex gap-2 ml-auto">
                  <button 
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl transition-all"
                  >
                    Withdraw
                  </button>
                  <button
                    type="submit"
                    onClick={handleSaveProductSubmit}
                    disabled={isSavingProduct}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all flex items-center gap-1.5"
                  >
                    {isSavingProduct ? 'Filing sheets...' : editingProduct.id ? 'Authorize Modifications' : 'Create Record'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
