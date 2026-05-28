/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Product, Order, AdminAnalytics, OrderStatus } from '../src/types.js';

const DB_FILE = path.join(process.cwd(), 'database.json');

// Initial Seed Products
const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    title: 'Aura Active ANC Headphones',
    description: 'Experience pure sonic isolation with the Aura Active noise-cancelling headphones. Built with custom custom-tuned 40mm beryllium drivers, active smart ambient feedback, and an ergonomic lightweight anodized aluminium frame with plush memory foam ear cups.',
    price: 349,
    rating: 4.8,
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 45,
    colors: ['#1A1A1A', '#EFEFEE', '#2C3E50'],
    sizes: ['Standard'],
    specs: [
      { label: 'Driver Size', value: '40mm Beryllium' },
      { label: 'Battery Life', value: 'Up to 34 hours' },
      { label: 'Connectivity', value: 'Bluetooth 5.3 & Ultra-wideband' },
      { label: 'Weight', value: '255g' }
    ],
    featured: true
  },
  {
    id: 'prod-2',
    title: 'Chronos Minimalist Chronograph',
    description: 'A timeless timepiece designed for the modern era. Features a bespoke Japanese automatic mechanical automatic movement, surgical-grade 316L stainless steel structural casing, scratch-resistant sapphire crystal glass, and a handcrafted Horween leather strap.',
    price: 249,
    rating: 4.9,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1539874754764-5a96559165b0?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 12,
    colors: ['#1A1A1A', '#C0C0C0', '#8B5A2B'],
    sizes: ['41mm', '38mm'],
    specs: [
      { label: 'Movement', value: 'Miyota 9015 Automatic' },
      { label: 'Dial Case', value: '316L Surgical Steel' },
      { label: 'Water Depth', value: '5 ATM (50m)' },
      { label: 'Strap Material', value: 'Horween Genuine Leather' }
    ],
    featured: true
  },
  {
    id: 'prod-3',
    title: 'Apex Mechanical Lumber Keyboard',
    description: 'Form meets tactile precision. Hot-swappable MX custom switches nestled inside an exquisite walnut hardwood structure and custom double-shot PBT keycaps. Configured with dynamic under-glow acoustics and seamless multi-device Bluetooth linking.',
    price: 189,
    rating: 4.7,
    category: 'Computing',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 28,
    colors: ['#5C4033', '#2C3539', '#FFFFFF'],
    sizes: ['75% Layout', '100% Full'],
    specs: [
      { label: 'Switch Options', value: 'Gateron Brown Tactiles' },
      { label: 'Chassis', value: 'Solid Walnut Hardwood' },
      { label: 'Keycaps', value: 'Double-Shot PBT' },
      { label: 'Interface', value: 'USB-C / Bluetooth 5.1' }
    ],
    featured: true
  },
  {
    id: 'prod-4',
    title: 'Halo Smart Ambient Lamp',
    description: 'Transform your workspace or resting quarters. Casts pure, rich volumetric light using custom diffusers that mimic atmospheric dispersion. Interacts with touch gestures, features smart calendar reminders, and links to Spotify music nodes.',
    price: 129,
    rating: 4.6,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 62,
    colors: ['#FFFFFF', '#1A1A1A'],
    sizes: ['Compact', 'Tall Studio'],
    specs: [
      { label: 'Light Engine', value: 'High-CRI Multi-Spectrum LED' },
      { label: 'Brightness', value: '900 Lumens Max' },
      { label: 'Gesture Controls', value: 'Optical distance sensor' },
      { label: 'Power Supply', value: 'USB-C 20W PD' }
    ],
    featured: false
  },
  {
    id: 'prod-5',
    title: 'Sphere Fast Magnetic Charger',
    description: 'A structural piece of sculpture on your desk that charges your daily drivers effortlessly. Made of high-grade, premium Carrera marble and brushed silver metallic rails, with dedicated smart coils to safely quick-charge a phone, watch, and earbuds simultaneously.',
    price: 79,
    rating: 4.5,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 120,
    colors: ['#EAEAEA', '#1F1F1F'],
    sizes: ['Triple Node'],
    specs: [
      { label: 'Charging Speed', value: '15W Wireless Qi2 Standard' },
      { label: 'Core Base', value: 'Solid Carrera White Marble' },
      { label: 'Coil Alignments', value: 'Neodymium N52 Magnet arrays' },
      { label: 'Efficiency', value: 'Smart Thermal Cutoff' }
    ],
    featured: false
  },
  {
    id: 'prod-6',
    title: 'Vapour Tech Performance Fleece',
    description: 'A clean silhouette crafted using ultra-dense recycled thermal polymer fibers. Perfect for active commutes or focus sessions. Features double-entry concealed pockets, high-contrast flatlock stitching, and wind-blocking rib knit contours.',
    price: 99,
    rating: 4.3,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 5,
    colors: ['#34495E', '#2D3436', '#95A5A6'],
    sizes: ['S', 'M', 'L', 'XL'],
    specs: [
      { label: 'Fabric Composition', value: '88% Recycled Thermal Polyester, 12% Elastane' },
      { label: 'Wind Resistance', value: 'Up to 30mph gusts' },
      { label: 'Pockets', value: 'YKK Invisible Zip side nodes' },
      { label: 'Origin', value: 'Ethically Sourced & Knitted' }
    ],
    featured: false
  }
];

// Initial Seed Orders
const SEED_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    customerName: 'Marcus Sterling',
    customerEmail: 'sterling.marcus@gmail.com',
    shippingAddress: {
      line1: '1600 Amphitheatre Pkwy',
      city: 'Mountain View',
      state: 'CA',
      postalCode: '94043',
      country: 'US'
    },
    items: [
      {
        id: 'oi-1',
        product: { id: 'prod-1', title: 'Aura Active ANC Headphones', price: 349, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800' },
        quantity: 1,
        color: '#1A1A1A',
        size: 'Standard'
      },
      {
        id: 'oi-2',
        product: { id: 'prod-5', title: 'Sphere Fast Magnetic Charger', price: 79, image: 'https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&q=80&w=800' },
        quantity: 1,
        color: '#EAEAEA',
        size: 'Triple Node'
      }
    ],
    subtotal: 428,
    tax: 34.24,
    shipping: 15,
    total: 477.24,
    status: 'delivered',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    stripePaymentIntentId: 'pi_3Mwnb2LkdMwE7A1g1Ab7u7xZ'
  },
  {
    id: 'ord-1002',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@design.co',
    shippingAddress: {
      line1: '40 Soho Square',
      city: 'London',
      state: 'Greater London',
      postalCode: 'W1D 3QY',
      country: 'GB'
    },
    items: [
      {
        id: 'oi-3',
        product: { id: 'prod-2', title: 'Chronos Minimalist Chronograph', price: 249, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800' },
        quantity: 1,
        color: '#C0C0C0',
        size: '41mm'
      }
    ],
    subtotal: 249,
    tax: 49.80,
    shipping: 25,
    total: 323.80,
    status: 'shipped',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    stripePaymentIntentId: 'pi_3Mwnb2LkdMwE7A1g2Bc8v8yY'
  },
  {
    id: 'ord-1003',
    customerName: 'Kenji Takahashi',
    customerEmail: 'kenji.t@techtokyo.jp',
    shippingAddress: {
      line1: '2-1-1 Nihonbashi',
      city: 'Chuo-ku',
      state: 'Tokyo',
      postalCode: '103-0027',
      country: 'JP'
    },
    items: [
      {
        id: 'oi-4',
        product: { id: 'prod-3', title: 'Apex Mechanical Lumber Keyboard', price: 189, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=800' },
        quantity: 2,
        color: '#5C4033',
        size: '75% Layout'
      }
    ],
    subtotal: 378,
    tax: 37.80,
    shipping: 35,
    total: 450.80,
    status: 'processing',
    createdAt: new Date().toISOString(), // Today
    stripePaymentIntentId: 'pi_3Mwnb2LkdMwE7A1g3Cd9w9zZ'
  }
];

export interface DatabaseSchema {
  products: Product[];
  orders: Order[];
}

export class SharedDatabase {
  private schema: DatabaseSchema = { products: [], orders: [] };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.schema = JSON.parse(fileContent);
        // Ensure standard keys exist
        if (!this.schema.products) this.schema.products = [];
        if (!this.schema.orders) this.schema.orders = [];
      } else {
        this.schema = { products: SEED_PRODUCTS, orders: SEED_ORDERS };
        this.save();
      }
    } catch (e) {
      console.error('Error loading database, seeding defaults:', e);
      this.schema = { products: SEED_PRODUCTS, orders: SEED_ORDERS };
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // PRODUCTS CRUD
  getProducts(): Product[] {
    return this.schema.products;
  }

  getProductById(id: string): Product | undefined {
    return this.schema.products.find(p => p.id === id);
  }

  saveProduct(product: Product): Product {
    const idx = this.schema.products.findIndex(p => p.id === product.id);
    if (idx !== -1) {
      this.schema.products[idx] = product;
    } else {
      this.schema.products.push(product);
    }
    this.save();
    return product;
  }

  deleteProduct(id: string): boolean {
    const len = this.schema.products.length;
    this.schema.products = this.schema.products.filter(p => p.id !== id);
    if (this.schema.products.length !== len) {
      this.save();
      return true;
    }
    return false;
  }

  // ORDERS LEDGER & PROCESSING
  getOrders(): Order[] {
    return this.schema.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.schema.orders.find(o => o.id === id);
  }

  saveOrder(order: Order): Order {
    const idx = this.schema.orders.findIndex(o => o.id === order.id);
    if (idx !== -1) {
      this.schema.orders[idx] = order;
    } else {
      this.schema.orders.push(order);
    }

    // Deduct inventory when order is created for the first time
    if (idx === -1) {
      order.items.forEach(item => {
        const p = this.getProductById(item.product.id);
        if (p) {
          p.stock = Math.max(0, p.stock - item.quantity);
          this.saveProduct(p);
        }
      });
    }

    this.save();
    return order;
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const oldStatus = order.status;
    order.status = status;

    // Refund: put inventory back
    if (status === 'refunded' && oldStatus !== 'refunded') {
      order.items.forEach(item => {
        const p = this.getProductById(item.product.id);
        if (p) {
          p.stock += item.quantity;
          this.saveProduct(p);
        }
      });
    }

    this.save();
    return order;
  }

  // ANALYTICS COMPILER
  getAnalytics(): AdminAnalytics {
    const activeOrders = this.schema.orders.filter(o => o.status !== 'refunded');
    const refundedOrders = this.schema.orders.filter(o => o.status === 'refunded');

    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const orderCount = this.schema.orders.length;
    const activeCount = activeOrders.length;
    const averageOrderValue = activeCount > 0 ? totalRevenue / activeCount : 0;

    // Compile dynamic Daily Sales history (last 7 days)
    const salesHistoryMap = new Map<string, { revenue: number, orders: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      salesHistoryMap.set(dateStr, { revenue: 0, orders: 0 });
    }

    activeOrders.forEach(o => {
      const dateStr = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (salesHistoryMap.has(dateStr)) {
        const current = salesHistoryMap.get(dateStr)!;
        current.revenue += o.subtotal;
        current.orders += 1;
        salesHistoryMap.set(dateStr, current);
      }
    });

    const salesHistory = Array.from(salesHistoryMap.entries()).map(([date, val]) => ({
      date,
      revenue: val.revenue,
      orders: val.orders
    }));

    // Compile Category distribution
    const categoryRevenueMap = new Map<string, number>();
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        const p = this.getProductById(item.product.id);
        const category = p ? p.category : 'General';
        const revenue = item.product.price * item.quantity;
        categoryRevenueMap.set(category, (categoryRevenueMap.get(category) || 0) + revenue);
      });
    });

    const colors = ['#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#EC4899'];
    const categoryDistribution = Array.from(categoryRevenueMap.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));

    if (categoryDistribution.length === 0) {
      categoryDistribution.push({ name: 'Audio', value: 0, color: '#6366F1' });
      categoryDistribution.push({ name: 'Lifestyle', value: 0, color: '#14B8A6' });
    }

    // Top Products sold
    const productSalesMap = new Map<string, { count: number; revenue: number; title: string, image: string }>();
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        const current = productSalesMap.get(item.product.id) || { count: 0, revenue: 0, title: item.product.title, image: item.product.image };
        current.count += item.quantity;
        current.revenue += item.product.price * item.quantity;
        productSalesMap.set(item.product.id, current);
      });
    });

    const topProducts = Array.from(productSalesMap.entries()).map(([id, val]) => ({
      id,
      title: val.title,
      salesCount: val.count,
      revenue: val.revenue,
      image: val.image
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Build static elegant Conversion Funnel (sessions, cards, checkout, completions)
    // Assume base traffic values relative to current orders count
    const baseViews = 1250 + orderCount * 12;
    const cartAdds = 480 + orderCount * 4;
    const checkoutInitiated = 180 + orderCount * 2;
    const purchased = orderCount;

    const funnel = [
      { stage: 'Site Product Views', count: baseViews, percentage: 100 },
      { stage: 'Add to Cart', count: cartAdds, percentage: Math.round((cartAdds / baseViews) * 100) },
      { stage: 'Checkout Initiated', count: checkoutInitiated, percentage: Math.round((checkoutInitiated / baseViews) * 100) },
      { stage: 'Order Purchased', count: purchased, percentage: Math.round((purchased / baseViews) * 100) }
    ];

    const conversionRate = parseFloat(((purchased / baseViews) * 100).toFixed(2)) || 0;

    return {
      totalRevenue,
      orderCount,
      averageOrderValue,
      conversionRate,
      salesHistory,
      categoryDistribution,
      funnel,
      topProducts
    };
  }
}

export const db = new SharedDatabase();
