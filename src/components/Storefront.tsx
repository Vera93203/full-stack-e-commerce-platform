/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, SlidersHorizontal, ShoppingBag, ArrowRight, X, 
  Minus, Plus, CreditCard, CheckCircle, ChevronRight, Star,
  Truck, ShieldCheck, Mail, Sparkles, MapPin, Eye
} from 'lucide-react';
import { Product, CartItem, Order } from '../types.ts';

interface StorefrontProps {
  onNavigateToAdmin: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  orders: Order[];
  onOrderCompleted: (order: Order) => void;
}

export default function Storefront({
  onNavigateToAdmin,
  cart,
  setCart,
  orders,
  onOrderCompleted
}: StorefrontProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop');

  // Product Listings
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState('default');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Selected Product Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Sinks & Subsystems
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeOrderConfirmation, setActiveOrderConfirmation] = useState<Order | null>(null);

  // Checkout Fields
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('US');

  // Autocomplete suggestions
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Real Google Maps state (if available)
  const mapsApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

  // Stripe Checkout simulation
  const [isPaying, setIsPaying] = useState(false);
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Trigger Debounce on Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Products based on filtering queries
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (debouncedSearch) queryParams.set('search', debouncedSearch);
        if (selectedCategory && selectedCategory !== 'All') queryParams.set('category', selectedCategory);
        if (priceRange[0] > 0) queryParams.set('priceMin', priceRange[0].toString());
        if (priceRange[1] < 1000) queryParams.set('priceMax', priceRange[1].toString());
        if (selectedRating !== null) queryParams.set('rating', selectedRating.toString());
        if (sortOption !== 'default') queryParams.set('sort', sortOption);

        const res = await fetch(`/api/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (e) {
        console.error('Failed to load catalog:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredProducts();
  }, [debouncedSearch, selectedCategory, priceRange, selectedRating, sortOption]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Cart operations
  const addToCart = (product: Product, color?: string, size?: string) => {
    // Inventory safeguard
    if (product.stock <= 0) {
      showNotification('This item is currently out of stock');
      return;
    }

    const finalColor = color || (product.colors.length > 0 ? product.colors[0] : undefined);
    const finalSize = size || (product.sizes.length > 0 ? product.sizes[0] : undefined);

    setCart(prev => {
      const idx = prev.findIndex(
        item => 
          item.product.id === product.id && 
          item.selectedColor === finalColor && 
          item.selectedSize === finalSize
      );

      if (idx !== -1) {
        const currentQty = prev[idx].quantity;
        if (currentQty >= product.stock) {
          showNotification(`Limit reached: Only ${product.stock} items available in stock`);
          return prev;
        }
        const updated = [...prev];
        updated[idx].quantity += 1;
        showNotification(`Added another ${product.title} to your bag`);
        return updated;
      }

      showNotification(`Added ${product.title} to your bag`);
      return [...prev, { product, quantity: 1, selectedColor: finalColor, selectedSize: finalSize }];
    });
  };

  const updateCartQuantity = (idx: number, change: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + change;
      const originalStock = updated[idx].product.stock;

      if (newQty <= 0) {
        updated.splice(idx, 1);
        showNotification('Item removed from cart');
        return updated;
      }

      if (newQty > originalStock) {
        showNotification(`Only ${originalStock} available in stock`);
        return prev;
      }

      updated[idx].quantity = newQty;
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    showNotification('Shopping cart cleared');
  };

  // Financial Mathematics
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = parseFloat((subtotal * 0.08).toFixed(2));
  const shipping = subtotal > 150 ? 0 : subtotal > 0 ? 15 : 0;
  const total = parseFloat((subtotal + tax + shipping).toFixed(2));

  // Google Places Autocomplete local simulator
  const handleAddressChange = (val: string) => {
    setAddressLine(val);
    if (!val.trim()) {
      setAddressSuggestions([]);
      return;
    }

    // Sample dynamic address list for beautiful reactive autocompletes
    const mockDb = [
      '1600 Amphitheatre Pkwy, Mountain View, CA 94043',
      '111 8th Ave, New York, NY 10011',
      '3400 Stone Way N, Seattle, WA 98103',
      '40 Soho Square, London, W1D 3QY, UK',
      '79-81 Boulevard Haussmann, 75008 Paris, France2',
      '2-1-1 Nihonbashi, Chuo-ku, Tokyo 103-0027, Japan'
    ];

    const matched = mockDb.filter(addr => addr.toLowerCase().includes(val.toLowerCase()));
    setAddressSuggestions(matched);
    setShowSuggestions(matched.length > 0);
  };

  const selectSuggestion = (addr: string) => {
    const parts = addr.split(', ');
    if (parts.length >= 3) {
      setAddressLine(parts[0]);
      setAddressCity(parts[1] || 'Mountain View');
      const stateZip = parts[2].split(' ');
      setAddressState(stateZip[0] || 'CA');
      setAddressZip(stateZip[1] || '94043');
      if (parts[3]) setAddressCountry(parts[3]);
    } else {
      setAddressLine(addr);
    }
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  // Checkout submission
  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerEmail || !addressLine) {
      showNotification('Please fill in all mandatory billing fields');
      return;
    }

    setIsPaying(true);

    // Simulate Network latency / Stripe charge verification
    setTimeout(async () => {
      try {
        const payload = {
          customerName: buyerName,
          customerEmail: buyerEmail,
          shippingAddress: {
            line1: addressLine,
            city: addressCity || 'Silicon Valley',
            state: addressState || 'CA',
            postalCode: addressZip || '95014',
            country: addressCountry || 'US'
          },
          items: cart.map((item, idx) => ({
            id: `oi-srv-${idx}`,
            product: {
              id: item.product.id,
              title: item.product.title,
              price: item.product.price,
              image: item.product.image
            },
            quantity: item.quantity,
            color: item.selectedColor,
            size: item.selectedSize
          })),
          subtotal,
          tax,
          shipping,
          total
        };

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const finishedOrder = await res.json();
          onOrderCompleted(finishedOrder);
          setActiveOrderConfirmation(finishedOrder);
          setCart([]); // Clear Cart state
          setIsCheckoutOpen(false);
          setActiveTab('orders');
          showNotification('Payment successful! Invoice dispatched.');
        } else {
          const errData = await res.json();
          showNotification(errData.error || 'Checkout process block');
        }
      } catch (err) {
        showNotification('Stripe checkout error connection');
      } finally {
        setIsPaying(false);
      }
    }, 2000); // 2 second majestic processing spin
  };

  return (
    <div id="storefront-root" className="min-h-screen bg-neutral-50 text-neutral-950 font-sans tracking-normal pb-16">
      
      {/* Floating Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 bg-neutral-900 text-white px-5 py-3.5 rounded-xl shadow-xl border border-neutral-800 flex items-center gap-3 text-sm font-medium"
          >
            <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER CONTROLS */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-neutral-200/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2 select-none">
              <span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-base font-extrabold shadow-sm">
                S
              </span>
              Sovereign <span className="font-light text-neutral-500 text-sm tracking-wide bg-neutral-100 px-2 py-0.5 rounded-md">Retail</span>
            </span>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
              <button 
                onClick={() => { setActiveTab('shop'); setActiveOrderConfirmation(null); }}
                className={`transition-colors py-2 h-18 border-b-2 flex items-center ${activeTab === 'shop' && !activeOrderConfirmation ? 'text-indigo-600 border-indigo-600' : 'text-neutral-500 border-transparent hover:text-neutral-950'}`}
              >
                Shop Collection
              </button>
              <button 
                onClick={() => { setActiveTab('orders'); }}
                className={`transition-colors py-2 h-18 border-b-2 flex items-center gap-1.5 ${activeTab === 'orders' || activeOrderConfirmation ? 'text-indigo-600 border-indigo-600' : 'text-neutral-500 border-transparent hover:text-neutral-950'}`}
              >
                My Orders
                {orders.length > 0 && (
                  <span className="h-4 px-1 min-w-4 rounded-full bg-neutral-200 text-neutral-700 text-[10px] grid place-items-center font-bold">
                    {orders.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Dashboard Link */}
            <button 
              onClick={onNavigateToAdmin}
              className="px-4 py-2 rounded-xl text-neutral-700 hover:text-neutral-950 text-xs font-semibold hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
            >
              Enterprise Admin
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            {/* Shopping Bag trigger */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors"
              aria-label="Open persistent shopping bag"
            >
              <ShoppingBag className="h-5.5 w-5.5 stroke-[1.8]" />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-indigo-600 text-white rounded-full text-xs font-bold grid place-items-center tracking-tight shadow-md animate-pulse">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* RENDER VIEW */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* VIEW A: SHOP CATALOG */}
        {activeTab === 'shop' && !activeOrderConfirmation && (
          <div>
            {/* LUXURY HERO SLIDE */}
            <div className="relative rounded-3xl overflow-hidden bg-neutral-900 mb-12 shadow-md">
              <img 
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1600" 
                alt="Sovereign Collection banner" 
                className="absolute inset-0 w-full h-full object-cover opacity-35 object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent" />
              <div className="relative py-20 px-10 md:px-16 max-w-2xl flex flex-col items-start gap-4">
                <span className="bg-indigo-600/95 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  Luminescent Objects V1
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  Crafted for tactile and acoustic perfection.
                </h1>
                <p className="text-neutral-300 text-sm md:text-base leading-relaxed font-light">
                  A carefully gathered series of minimalist instruments designed to calm, align, and enhance your creative focus station.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <a href="#catalogue" className="px-6 py-3.5 rounded-xl bg-white text-neutral-950 text-sm font-semibold hover:bg-neutral-100 transition-all shadow-sm flex items-center gap-2">
                    Browse Instruments
                    <ArrowRight className="h-4 w-4 text-indigo-600" />
                  </a>
                </div>
              </div>
            </div>

            <div id="catalogue" className="lg:grid lg:grid-cols-4 lg:gap-8 items-start">
              
              {/* FILTERS SIDEBAR */}
              <div className="hidden lg:block lg:col-span-1 bg-white p-6 rounded-2xl border border-neutral-200/60 sticky top-28 shadow-xs">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
                  <span className="font-bold text-neutral-950 flex items-center gap-2 text-sm">
                    <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
                    Refine Catalog
                  </span>
                  {(selectedCategory !== 'All' || priceRange[0] !== 0 || priceRange[1] !== 500 || selectedRating !== null || searchQuery !== '') && (
                    <button 
                      onClick={() => {
                        setSelectedCategory('All');
                        setPriceRange([0, 500]);
                        setSelectedRating(null);
                        setSearchQuery('');
                      }}
                      className="text-indigo-600 text-xs font-semibold hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Categories</h3>
                  <div className="flex flex-col gap-2">
                    {['All', 'Audio', 'Lifestyle', 'Computing', 'Apparel'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-left text-sm py-1.5 px-2.5 rounded-lg transition-colors font-medium ${selectedCategory === cat ? 'bg-indigo-50 text-indigo-600' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Price Boundaries</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-neutral-400 block font-medium uppercase mb-1">Min ($)</label>
                      <input 
                        type="number" 
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Math.max(0, parseInt(e.target.value) || 0), priceRange[1]])}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-neutral-400 block font-medium uppercase mb-1">Max ($)</label>
                      <input 
                        type="number" 
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Math.max(0, parseInt(e.target.value) || 0)])}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Ratings */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Customer Quality</h3>
                  <div className="flex flex-col gap-1.5">
                    {[4.8, 4.5, 4.0].map((starVal) => (
                      <button
                        key={starVal}
                        onClick={() => setSelectedRating(selectedRating === starVal ? null : starVal)}
                        className={`flex items-center gap-2 text-left text-xs py-1.5 px-2.5 rounded-lg transition-colors ${selectedRating === starVal ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}
                      >
                        <div className="flex text-amber-500 gap-0.5">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                        <span>{starVal}+ Exceptional Rating</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PRODUCTS LIST */}
              <div className="col-span-3">
                {/* Search & Sort Panel */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input 
                      type="text" 
                      placeholder="Search title, details, category, materials..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-xs font-medium"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-150 rounded-full text-neutral-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">
                      {products.length} products found
                    </span>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="bg-white border border-neutral-200.60 text-neutral-700 text-xs px-3.5 py-2.5 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="default">Default Sorting</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="rating">Rating: Highly Trusted</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic grid cards */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-neutral-100 p-4 h-96 flex flex-col justify-between animate-pulse">
                        <div className="bg-neutral-200 rounded-xl w-full h-48" />
                        <div className="space-y-3 mt-4">
                          <div className="bg-neutral-200 h-4 rounded-md w-3/4" />
                          <div className="bg-neutral-200 h-3 rounded-md w-1/2" />
                        </div>
                        <div className="bg-neutral-200 h-8 rounded-lg w-full mt-4" />
                      </div>
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200/50 p-8">
                    <ShoppingBag className="h-10 w-10 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-neutral-800">No objects match your search</h3>
                    <p className="text-neutral-500 text-xs mt-1.5 max-w-sm mx-auto">
                      Try updating your category sliders, clearing terms, or altering price parameters.
                    </p>
                    <button 
                      onClick={() => {
                        setSelectedCategory('All');
                        setPriceRange([0, 500]);
                        setSelectedRating(null);
                        setSearchQuery('');
                      }}
                      className="mt-4 px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => {
                      const isLowStock = product.stock > 0 && product.stock <= 5;
                      const isOutOfStock = product.stock === 0;

                      return (
                        <motion.div
                          key={product.id}
                          layout
                          className="group h-full bg-white rounded-2xl border border-neutral-200/60 transition-all flex flex-col justify-between overflow-hidden relative shadow-xs hover:shadow-md"
                        >
                          {/* Badges */}
                          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                            {product.featured && (
                              <span className="bg-neutral-900 text-white font-bold tracking-widest text-[8px] uppercase px-2 py-0.58 rounded-sm">Featured</span>
                            )}
                            {isOutOfStock ? (
                              <span className="bg-red-600 text-white font-bold tracking-wider text-[8px] uppercase px-2 py-0.58 rounded-sm">Out of Stock</span>
                            ) : isLowStock ? (
                              <span className="bg-amber-500 text-white font-bold tracking-wider text-[8px] uppercase px-2 py-0.58 rounded-sm">Only {product.stock} Left</span>
                            ) : null}
                          </div>

                          {/* Image box */}
                          <div className="relative bg-neutral-100 overflow-hidden h-52 group-hover:opacity-95 transition-opacity">
                            <img 
                              src={product.image} 
                              alt={product.title} 
                              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            {/* Hover overlay Quick View */}
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button 
                                onClick={() => { setSelectedProduct(product); setActiveImageIdx(0); }}
                                className="p-2.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center justify-center"
                                title="Quick Inspection"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </div>

                          {/* Detail Box */}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div className="mb-4">
                              <div className="flex items-center gap-1 mb-1.5">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{product.category}</span>
                                <span className="text-neutral-300">•</span>
                                <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                                  <Star className="h-2.5 w-2.5 fill-current" />
                                  <span className="font-semibold text-neutral-600 text-[10px]">{product.rating}</span>
                                </div>
                              </div>
                              <h3 
                                onClick={() => { setSelectedProduct(product); setActiveImageIdx(0); }}
                                className="font-bold text-neutral-900 group-hover:text-indigo-600 tracking-tight transition-colors line-clamp-1 cursor-pointer"
                              >
                                {product.title}
                              </h3>
                              <p className="text-neutral-500 text-xs leading-relaxed line-clamp-2 mt-1.5">{product.description}</p>
                            </div>

                            <div>
                              {/* Swatch Previews */}
                              {product.colors && product.colors.length > 1 && (
                                <div className="flex gap-1 mb-3">
                                  {product.colors.map(col => (
                                    <span 
                                      key={col} 
                                      style={{ backgroundColor: col }} 
                                      className="h-2.5 w-2.5 rounded-full border border-neutral-200"
                                    />
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                                <span className="font-extrabold text-neutral-950 text-base">${product.price}</span>
                                <button
                                  onClick={() => addToCart(product)}
                                  disabled={isOutOfStock}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${isOutOfStock ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-950 text-white hover:bg-indigo-600 active:scale-95'}`}
                                >
                                  {isOutOfStock ? 'Sold Out' : 'Add to Bag'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW B: PERSONAL ORDER HISTORY */}
        {activeTab === 'orders' && (
          <div className="max-w-3xl mx-auto py-4">
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mb-6">Recent Deliveries & Orders</h2>
            
            {orders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200/50 p-8 shadow-xs">
                <CheckCircle className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-neutral-800">No transactions recorded</h3>
                <p className="text-neutral-500 text-xs mt-1 max-w-sm mx-auto">
                  You haven&apos;t placed any premium orders yet. Browse our objects catalogue to place your first order.
                </p>
                <button 
                  onClick={() => setActiveTab('shop')}
                  className="mt-5 px-5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const statusColors = {
                    processing: 'bg-amber-50 text-amber-600 border-amber-200',
                    shipped: 'bg-indigo-50 text-indigo-600 border-indigo-200',
                    delivered: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                    refunded: 'bg-red-50 text-red-600 border-red-200'
                  };

                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-neutral-250 p-6 shadow-xs">
                      {/* Order top bar */}
                      <div className="flex flex-col sm:flex-row justify-between pb-4 border-b border-neutral-100/60 gap-3 items-start sm:items-center">
                        <div className="space-y-0.5">
                          <span className="text-xs text-neutral-400 font-bold tracking-widest uppercase">ID: {order.id}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-neutral-800">Total Charged: ${order.total}</span>
                            <span className="text-xs text-neutral-400">•</span>
                            <span className="text-xs text-neutral-500 font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="py-4 space-y-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex gap-4 items-center">
                            <img 
                              src={item.product.image} 
                              alt={item.product.title} 
                              className="h-12 w-12 rounded-lg object-cover bg-neutral-100"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-neutral-950 truncate">{item.product.title}</h4>
                              <div className="flex gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                                <span>Quantity: {item.quantity}</span>
                                {item.color && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      Color: 
                                      <span style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-full inline-block border border-neutral-300" />
                                    </span>
                                  </>
                                )}
                                {item.size && (
                                  <>
                                    <span>•</span>
                                    <span>Size: {item.size}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-neutral-700">${item.product.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Shipments Info */}
                      <div className="bg-neutral-50/70 p-4 rounded-xl text-xs border border-neutral-100 flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px] block">Customer Details</span>
                          <h5 className="font-bold text-neutral-800">{order.customerName}</h5>
                          <span className="text-neutral-500 block">{order.customerEmail}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px] block font-semibold">Delivery Address</span>
                          <span className="text-neutral-600 block leading-tight">
                            {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                          </span>
                        </div>
                        {order.status === 'processing' && (
                          <div className="flex items-center gap-1 text-indigo-600 font-semibold self-start md:self-center">
                            <Truck className="h-4 w-4 animate-bounce" />
                            <span>Queued for sorting</span>
                          </div>
                        )}
                        {order.status === 'shipped' && (
                          <div className="flex items-center gap-1 text-indigo-600 font-semibold self-start md:self-center">
                            <Truck className="h-4 w-4" />
                            <span>In Transit</span>
                          </div>
                        )}
                        {order.status === 'delivered' && (
                          <div className="flex items-center gap-1 text-emerald-600 font-semibold self-start md:self-center">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Handed over successfully</span>
                          </div>
                        )}
                        {order.status === 'refunded' && (
                          <div className="flex items-center gap-1 text-red-600 font-semibold self-start md:self-center">
                            <X className="h-4 w-4" />
                            <span>Funds Released</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* DETAILED INSPECT MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />

            {/* Content sheet */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 grid grid-cols-1 md:grid-cols-2 h-[90vh] md:h-auto max-h-[90vh]"
            >
              {/* Image galleries */}
              <div className="p-6 bg-neutral-50 flex flex-col justify-between h-1/2 md:h-full">
                <div className="relative h-64 md:h-96 w-full rounded-2xl overflow-hidden bg-white border border-neutral-100">
                  <img 
                    src={selectedProduct.images[activeImageIdx] || selectedProduct.image} 
                    alt={selectedProduct.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Stock tag */}
                  {selectedProduct.stock === 0 ? (
                    <span className="absolute top-4 left-4 bg-red-600 text-white font-bold tracking-widest text-[9px] uppercase px-2.5 py-1 rounded-sm">Out of Stock</span>
                  ) : selectedProduct.stock <= 5 ? (
                    <span className="absolute top-4 left-4 bg-amber-500 text-white font-bold tracking-wider text-[9px] uppercase px-2.5 py-1 rounded-sm">Only {selectedProduct.stock} left</span>
                  ) : null}
                </div>

                {/* Sub-images list */}
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1">
                    {selectedProduct.images.map((imgUrl, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIdx(i)}
                        className={`h-16 w-16 min-w-16 rounded-xl overflow-hidden border-2 transition-all ${activeImageIdx === i ? 'border-indigo-600 scale-95 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      >
                        <img src={imgUrl} alt="Thumbnail view" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Text sheet */}
              <div className="p-8 flex flex-col justify-between overflow-y-auto h-1/2 md:h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{selectedProduct.category}</span>
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="p-1 hover:bg-neutral-100 rounded-full text-neutral-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <h2 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug">{selectedProduct.title}</h2>
                  
                  <div className="flex items-center gap-2 mt-2 mb-4">
                    <Star className="h-4 w-4 text-amber-500 fill-current" />
                    <span className="font-bold text-neutral-800 text-sm">{selectedProduct.rating}</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-xs text-neutral-500">{selectedProduct.stock > 0 ? 'Verified Available' : 'No Current Inventory'}</span>
                  </div>

                  <p className="text-neutral-600 text-sm leading-relaxed mb-6 font-light">{selectedProduct.description}</p>

                  {/* Colors block */}
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div className="mb-5">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">Select Finishes</span>
                      <div className="flex gap-2">
                        {selectedProduct.colors.map(col => (
                          <button
                            key={col}
                            onClick={() => setSelectedColor(col)}
                            style={{ backgroundColor: col }}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${selectedColor === col || (!selectedColor && selectedProduct.colors[0] === col) ? 'border-indigo-600 ring-2 ring-indigo-100 scale-90' : 'border-neutral-200'}`}
                            title={col}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizes / Layout block */}
                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <div className="mb-6">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">Choose Sizing / Layout</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.sizes.map(sz => (
                          <button
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className={`px-4 py-2 border text-xs font-semibold rounded-xl transition-all ${selectedSize === sz || (!selectedSize && selectedProduct.sizes[0] === sz) ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'}`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tech Specs list */}
                  {selectedProduct.specs && selectedProduct.specs.length > 0 && (
                    <div className="border-t border-neutral-100 pt-5 mb-6">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-3">Specifications</span>
                      <div className="grid grid-cols-2 gap-3.5">
                        {selectedProduct.specs.map((sp, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">{sp.label}</span>
                            <span className="text-xs font-medium text-neutral-800 block">{sp.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-neutral-100 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">Total Price</span>
                    <span className="text-xl font-extrabold text-neutral-950 block">${selectedProduct.price}</span>
                  </div>
                  <button
                    onClick={() => {
                      addToCart(selectedProduct, selectedColor, selectedSize);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.stock === 0}
                    className={`flex-1 px-6 py-4 rounded-xl text-center text-sm font-bold shadow-xs transition-all ${selectedProduct.stock === 0 ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-950 text-white hover:bg-indigo-600 hover:scale-[1.01] active:scale-95'}`}
                  >
                    {selectedProduct.stock === 0 ? 'Item Sold Out' : 'Assemble and Add to Bag'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERSISTENT CART CABINET */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xxs"
            />

            {/* Sliding Panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-white border-l border-neutral-205 flex flex-col justify-between shadow-2xl h-full"
              >
                {/* Cart Top Section */}
                <div className="p-6 border-b border-neutral-150 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-990 tracking-tight flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-indigo-600" />
                      Shopping Bag
                    </h2>
                    <span className="text-xs text-neutral-400 font-medium">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} instruments queued
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* List items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {cart.length === 0 ? (
                    <div className="text-center py-20">
                      <ShoppingBag className="h-10 w-10 text-neutral-300 mx-auto mb-4" />
                      <h4 className="text-sm font-bold text-neutral-700">Your bag is empty</h4>
                      <p className="text-xs text-neutral-400 max-w-[200px] mx-auto mt-1 leading-relaxed">
                        Explore the studio collections and discover high-fidelity tools.
                      </p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="flex gap-4 pb-5 border-b border-neutral-100 last:border-0">
                        <img 
                          src={item.product.image} 
                          alt={item.product.title} 
                          className="h-16 w-16 min-w-16 rounded-xl object-cover bg-neutral-100 border border-neutral-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-neutral-950 truncate leading-snug">{item.product.title}</h4>
                            <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] text-neutral-400">
                              <span>{item.product.category}</span>
                              {item.selectedColor && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    Finish: 
                                    <span style={{ backgroundColor: item.selectedColor }} className="h-2 w-2 rounded-full inline-block border border-neutral-200" />
                                  </span>
                                </>
                              )}
                              {item.selectedSize && (
                                <>
                                  <span>•</span>
                                  <span>Format: {item.selectedSize}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-2.5">
                            {/* Quantity counters */}
                            <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-2 py-0.5">
                              <button 
                                onClick={() => updateCartQuantity(idx, -1)}
                                className="p-0.5 hover:bg-neutral-100 rounded text-neutral-500"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-bold text-neutral-800 w-4 text-center select-none">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => updateCartQuantity(idx, 1)}
                                className="p-0.5 hover:bg-neutral-100 rounded text-neutral-500"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="text-xs font-bold text-neutral-950">${item.product.price * item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotals Block */}
                {cart.length > 0 && (
                  <div className="p-6 border-t border-neutral-150 bg-neutral-50/70 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Items Subtotal</span>
                        <span>${subtotal}</span>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Local Excise Tax (8%)</span>
                        <span>${tax}</span>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Standard Courier Shipping</span>
                        <span>{shipping === 0 ? <strong className="text-emerald-600">Free</strong> : `$${shipping}`}</span>
                      </div>
                      {shipping > 0 && (
                        <p className="text-[10px] text-indigo-500 bg-indigo-50/50 p-2 rounded-lg font-medium">
                          Add <strong>${150 - subtotal}</strong> more to qualify for Free Shipping!
                        </p>
                      )}
                      <div className="flex justify-between font-extrabold text-neutral-950 text-base pt-2 border-t border-neutral-100">
                        <span>Aggregate Total</span>
                        <span>${total}</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={clearCart}
                        className="px-4 py-3 border border-neutral-250 hover:bg-neutral-100 text-neutral-600 text-xs font-bold rounded-xl transition-all"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => {
                          setIsCartOpen(false);
                          setIsCheckoutOpen(true);
                        }}
                        className="flex-1 py-3 text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        Secure Checkout
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* IMMERSIVE STRIPE CHECKOUT BRIDGE */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />

            {/* Form Sheet */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 h-[92vh] max-h-[92vh] flex flex-col justify-between"
            >
              {/* Top bar */}
              <div className="p-6 border-b border-neutral-150 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-950 flex items-center gap-1.5">
                    <CreditCard className="h-4.5 w-4.5 text-indigo-600" />
                    Stripe Payment Processing
                  </h3>
                  <span className="text-xs text-neutral-400">Secure AES-256 Encrypted Transfer</span>
                </div>
                <button 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="p-1 hover:bg-neutral-100 rounded-full text-neutral-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Central Details */}
              <form onSubmit={handleCompletePayment} className="flex-1 overflow-y-auto p-8 space-y-6">
                
                {/* Product list preview */}
                <div className="bg-neutral-50/50 rounded-2xl p-4 border border-neutral-100 space-y-3">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Billing Inventory Recap</span>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-neutral-700 truncate max-w-[280px] font-medium">
                        {item.quantity}x {item.product.title}
                      </span>
                      <span className="font-bold text-neutral-900 ml-2">${item.product.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-neutral-100 flex justify-between font-bold text-neutral-950 text-sm">
                    <span>Aggregate Ledger</span>
                    <span>${total}</span>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1.5">Buyer Verification</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase text-neutral-500 block font-bold mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="e.g. Marcus Aurelius"
                        className="w-full bg-neutral-50 border border-neutral-200.60 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-neutral-500 block font-bold mb-1.5">Courier Email <span className="text-red-500">*</span></label>
                      <input 
                        type="email" 
                        required
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="aurelius@google.co"
                        className="w-full bg-neutral-50 border border-neutral-200.60 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 relative">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1.5">Delivery Logistics</h4>
                  
                  {/* Google Autocomplete simulated Input */}
                  <div className="relative">
                    <label className="text-[10px] uppercase text-neutral-500 block font-bold mb-1.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-indigo-500" />
                      Street Address <span className="text-red-500">*</span>
                      <span className="text-[9px] text-neutral-400 font-light lowercase">powered by Google Places API</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={addressLine}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Start typing your street address..."
                      className="w-full bg-neutral-50 border border-neutral-200.60 rounded-xl px-3.5 py-2.5 pl-9 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                    />
                    <MapPin className="absolute left-3 bottom-3 h-3.5 w-3.5 text-neutral-400" />

                    {/* Suggestions list dropdown */}
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden font-medium text-xs">
                        {addressSuggestions.map((addr, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => selectSuggestion(addr)}
                            className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 text-neutral-700 font-medium truncate flex items-center gap-2"
                          >
                            <MapPin className="h-3 w-3 text-indigo-600 min-w-3" />
                            {addr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2 sm:col-span-2">
                      <label className="text-[10px] uppercase text-neutral-500 block font-semibold mb-1">City</label>
                      <input 
                        type="text" 
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        placeholder="Mountain View"
                        className="w-full bg-neutral-50 border border-neutral-200.60 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-neutral-500 block font-semibold mb-1">State</label>
                      <input 
                        type="text" 
                        value={addressState}
                        onChange={(e) => setAddressState(e.target.value)}
                        placeholder="CA"
                        className="w-full bg-neutral-50 border border-neutral-200.60 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-neutral-500 block font-semibold mb-1">Postal Code</label>
                      <input 
                        type="text" 
                        value={addressZip}
                        onChange={(e) => setAddressZip(e.target.value)}
                        placeholder="94043"
                        className="w-full bg-neutral-50 border border-neutral-200.60 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1.5">Stripe Card Elements</h4>
                  
                  <div className="bg-neutral-50/60 p-5 rounded-2xl border border-neutral-200/60 space-y-4">
                    <div>
                      <label className="text-[9px] uppercase text-neutral-400 block font-bold mb-1">Credit Card Number</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          value={cardNo}
                          onChange={(e) => setCardNo(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().substring(0, 19))}
                          placeholder="4242 4242 4242 4242"
                          className="w-full bg-white border border-neutral-205 rounded-xl px-3.5 py-2.5 pl-10 text-xs font-mono tracking-widest focus:ring-1 focus:ring-indigo-500"
                        />
                        <CreditCard className="absolute left-3.5 bottom-3 h-4.5 w-4.5 text-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] uppercase text-neutral-400 block font-bold mb-1">Expiry Period</label>
                        <input 
                          type="text" 
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value.replace(/[^\d/]/g, '').substring(0, 5))}
                          placeholder="MM/YY"
                          className="w-full bg-white border border-neutral-205 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase text-neutral-400 block font-bold mb-1">CVC Code</label>
                        <input 
                          type="password" 
                          required
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                          placeholder="•••"
                          className="w-full bg-white border border-neutral-205 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </form>

              {/* Confirm footer */}
              <div className="p-6 border-t border-neutral-150 bg-neutral-50/80 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">Billing Charged</span>
                  <span className="text-lg font-extrabold text-neutral-950 block">${total}</span>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="px-4 py-2.5 border border-neutral-250 hover:bg-neutral-100 text-neutral-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Withdraw
                  </button>
                  <button
                    type="submit"
                    onClick={handleCompletePayment}
                    disabled={isPaying || cart.length === 0}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm disabled:bg-neutral-400 disabled:cursor-not-allowed"
                  >
                    {isPaying ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Charging Element...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Secure Transfer</span>
                        <ChevronRight className="h-4.5 w-4.5" />
                      </>
                    )}
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
