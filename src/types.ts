/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Charcoal Grey", "41mm"
  type: 'color' | 'size' | 'default';
  value: string; // hex color or size rating
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  category: string;
  image: string;
  images: string[];
  stock: number;
  colors: string[];
  sizes: string[];
  specs: { label: string; value: string }[];
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'refunded';

export interface OrderItem {
  id: string;
  product: Pick<Product, 'id' | 'title' | 'price' | 'image'>;
  quantity: number;
  color?: string;
  size?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  stripePaymentIntentId: string;
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface FunnelDataPoint {
  stage: string;
  count: number;
  percentage: number;
}

export interface AdminAnalytics {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  conversionRate: number;
  salesHistory: SalesDataPoint[];
  categoryDistribution: CategoryDataPoint[];
  funnel: FunnelDataPoint[];
  topProducts: {
    id: string;
    title: string;
    salesCount: number;
    revenue: number;
    image: string;
  }[];
}
