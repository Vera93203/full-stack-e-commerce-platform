/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { Product, OrderStatus } from './src/types.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add middlewares for parsing JSON and file formats
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Create uploads folder if not exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploads statically
  app.use('/uploads', express.static(uploadsDir));

  // --- API API ENDPOINTS ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get products with search and filtering (Elasticsearch-like query parser)
  app.get('/api/products', (req, res) => {
    try {
      const { search, category, priceMin, priceMax, rating, sort } = req.query;
      let items = [...db.getProducts()];

      // Full-text search
      if (search) {
        const query = (search as string).toLowerCase().trim();
        items = items.filter(
          p =>
            p.title.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
      }

      // Faceted Category Filtering
      if (category && category !== 'All') {
        const cat = (category as string).toLowerCase().trim();
        items = items.filter(p => p.category.toLowerCase() === cat);
      }

      // Price ranges
      if (priceMin) {
        items = items.filter(p => p.price >= parseFloat(priceMin as string));
      }
      if (priceMax) {
        items = items.filter(p => p.price <= parseFloat(priceMax as string));
      }

      // Ratings
      if (rating) {
        items = items.filter(p => p.rating >= parseFloat(rating as string));
      }

      // Sorting
      if (sort) {
        switch (sort) {
          case 'price-asc':
            items.sort((a, b) => a.price - b.price);
            break;
          case 'price-desc':
            items.sort((a, b) => b.price - a.price);
            break;
          case 'rating':
            items.sort((a, b) => b.rating - a.rating);
            break;
          default:
            // Default "newest" or order inside our JSON
            break;
        }
      }

      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  });

  // Product details
  app.get('/api/products/:id', (req, res) => {
    const product = db.getProductById(req.params.id);
    if (!product) {
       res.status(404).json({ error: 'Product not found' });
       return;
    }
    res.json(product);
  });

  // Create Product (Admin CRUD with Local S3 Uplink Simulator)
  app.post('/api/products', (req, res) => {
    try {
      const data = req.body;
      let imageUrl = data.image || 'https://picsum.photos/seed/placeholder/800/800';

      // Parse uploaded base64 data to simulate local S3 disk persistence
      if (data.image && data.image.startsWith('data:image')) {
        const matches = data.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1].split('/')[1] || 'png';
          const buffer = Buffer.from(matches[2], 'base64');
          const fileName = `product_${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, fileName);
          fs.writeFileSync(filePath, buffer);
          imageUrl = `/uploads/${fileName}`;
        }
      }

      // Set multi-image gallery by duplicating main image or setting defaults
      const imagesList = data.images && data.images.length > 0 
        ? data.images 
        : [imageUrl];

      const newProduct: Product = {
        id: data.id || `prod-${Date.now()}`,
        title: data.title || 'Untitled Premium Product',
        description: data.description || '',
        price: parseFloat(data.price) || 0,
        rating: parseFloat(data.rating) || 5.0,
        category: data.category || 'General',
        image: imageUrl,
        images: imagesList,
        stock: parseInt(data.stock) || 0,
        colors: data.colors || ['#1A1A1A'],
        sizes: data.sizes || ['Standard'],
        specs: data.specs || []
      };

      db.saveProduct(newProduct);
      res.status(201).json(newProduct);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Product creation failed' });
    }
  });

  // Update Product (Admin Edit)
  app.put('/api/products/:id', (req, res) => {
    try {
      const existing = db.getProductById(req.params.id);
      if (!existing) {
         res.status(404).json({ error: 'Product not found' });
         return;
      }

      const data = req.body;
      let imageUrl = data.image || existing.image;

      // Parse uploaded base64 data to replace existing image (Local S3 Simulation)
      if (data.image && data.image.startsWith('data:image') && data.image !== existing.image) {
        const matches = data.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1].split('/')[1] || 'png';
          const buffer = Buffer.from(matches[2], 'base64');
          const fileName = `product_${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, fileName);
          fs.writeFileSync(filePath, buffer);
          imageUrl = `/uploads/${fileName}`;
        }
      }

      const imagesList = data.images && data.images.length > 0 
        ? data.images 
        : [imageUrl];

      const updated: Product = {
        ...existing,
        title: data.title !== undefined ? data.title : existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        price: data.price !== undefined ? parseFloat(data.price) : existing.price,
        rating: data.rating !== undefined ? parseFloat(data.rating) : existing.rating,
        category: data.category !== undefined ? data.category : existing.category,
        image: imageUrl,
        images: imagesList,
        stock: data.stock !== undefined ? parseInt(data.stock) : existing.stock,
        colors: data.colors || existing.colors,
        sizes: data.sizes || existing.sizes,
        specs: data.specs || existing.specs
      };

      db.saveProduct(updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Product edit failed' });
    }
  });

  // Delete Product
  app.delete('/api/products/:id', (req, res) => {
    const success = db.deleteProduct(req.params.id);
    if (!success) {
       res.status(404).json({ error: 'Product not found' });
       return;
    }
    res.json({ success: true });
  });

  // GET Orders (Admin)
  app.get('/api/orders', (req, res) => {
    res.json(db.getOrders().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  // POST Create Order (Checkout simulation with Stripe + Google Places autocomplete receipt email triggers)
  app.post('/api/orders', (req, res) => {
    try {
      const { customerName, customerEmail, shippingAddress, items, subtotal, tax, shipping, total, stripeId } = req.body;

      if (!customerName || !customerEmail || !items || items.length === 0) {
         res.status(400).json({ error: 'Missing required buyer fields' });
         return;
      }

      // Check stock levels before saving
      for (const item of items) {
        const p = db.getProductById(item.product.id);
        if (!p || p.stock < item.quantity) {
           res.status(400).json({ error: `Product ${p?.title || 'Unknown'} is out of stock / insufficient inventory` });
           return;
        }
      }

      const orderId = `ord-${1000 + db.getOrders().length + 1}`;
      const newOrder = {
        id: orderId,
        customerName,
        customerEmail,
        shippingAddress: shippingAddress || {
          line1: '1600 Amphitheatre Pkwy',
          city: 'Mountain View',
          state: 'CA',
          postalCode: '94043',
          country: 'US'
        },
        items,
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        shipping: parseFloat(shipping) || 0,
        total: parseFloat(total) || 0,
        status: 'processing' as OrderStatus,
        createdAt: new Date().toISOString(),
        stripePaymentIntentId: stripeId || `pi_sim_${Math.random().toString(36).substring(2, 15)}`
      };

      db.saveOrder(newOrder);

      // Trigger Simulated HTML Email Rendering to console as requested
      console.log('====================================================');
      console.log(`[SMTP SIMULATOR] Dynamic Order Confirmation Dispatch`);
      console.log(`To: ${customerEmail}`);
      console.log(`Subject: Your Receipt for Order #${orderId}`);
      console.log(`----------------------------------------------------`);
      console.log(`Thank you, ${customerName}! Your order totaling $${total} has been confirmed.`);
      console.log(`Items purchased:`);
      items.forEach((item: any) => {
        console.log(` - ${item.quantity}x ${item.product.title} (Variant: ${item.color || 'Default'} / ${item.size || 'Default'}) - $${item.product.price}`);
      });
      console.log(`Shipping to: ${newOrder.shippingAddress.line1}, ${newOrder.shippingAddress.city}, ${newOrder.shippingAddress.postalCode}`);
      console.log('====================================================');

      res.status(201).json(newOrder);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Checkout compilation crashed' });
    }
  });

  // Update Order Status (Admin Ledger Control)
  app.post('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    if (!status) {
       res.status(400).json({ error: 'Missing status property' });
       return;
    }

    const updated = db.updateOrderStatus(req.params.id, status as OrderStatus);
    if (!updated) {
       res.status(404).json({ error: 'Order not found' });
       return;
    }
    res.json(updated);
  });

  // Refund Order (Admin Ledger Control)
  app.post('/api/orders/:id/refund', (req, res) => {
    const updated = db.updateOrderStatus(req.params.id, 'refunded');
    if (!updated) {
       res.status(404).json({ error: 'Order not found' });
       return;
    }

    // Console logs showing Stripe refunds simulation
    console.log(`[STRIPE GATEWAY PROCESSOR] Initiating total financial refund for Intent ${updated.stripePaymentIntentId}`);
    console.log(`[STRIPE GATEWAY] Dynamic reverse capture code: RE_REFUND_SUCCESS_${updated.id}`);

    res.json(updated);
  });

  // GET Analytics aggregated data (Dashboard Analytics Panel)
  app.get('/api/analytics', (req, res) => {
    try {
      const metrics = db.getAnalytics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error processing metrics' });
    }
  });

  // --- VITE INTERFACES AND STATIC HANDLERS ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fullstack E-Commerce Server launched perfectly at http://localhost:${PORT}`);
  });
}

startServer();
