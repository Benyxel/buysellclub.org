// Development-wide API mock: intercepts fetch and axios to always return demo data
// Ensures ALL pages render without a backend

import axios from 'axios';

function jsonResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function buildMockData(url, init) {
  // Normalize
  const u = String(url || '').toLowerCase();

  // Admin endpoints
  if (u.includes('/api/admin/profile')) {
    return jsonResponse({ name: 'Demo Admin', email: 'admin@example.com', role: 'admin' });
  }
  if (u.includes('/api/admin/dashboard')) {
    return jsonResponse({
      totalUsers: 152,
      totalOrders: 87,
      totalAlipayPayments: 21,
      totalBuy4meRequests: 34,
      totalShippingMarks: 9,
      exchangeRate: '7.15',
    });
  }

  // User/profile endpoints
  if (u.includes('/api/user/profile')) {
    return jsonResponse({ name: 'Jane Doe', email: 'jane@example.com', phone: '+1-555-5555', address: '123 Example Rd' });
  }
  if (u.includes('/api/user/trackings')) {
    return jsonResponse([
      { trackingNumber: 'TRK5544', status: 'Delivered', sender: 'Logistics X', addedDate: new Date().toISOString(), product: 'Shoes', quantity: 2 },
      { trackingNumber: 'TRK8855', status: 'In Transit', sender: 'Courier Y', addedDate: new Date().toISOString(), product: 'Electronics', quantity: 1 },
    ]);
  }
  if (u.includes('/api/user/invoices')) {
    return jsonResponse([
      { id: 'inv001', amount: 42.15, createdDate: new Date().toISOString() },
      { id: 'inv002', amount: 214.99, createdDate: new Date(Date.now()-80000000).toISOString() },
    ]);
  }

  // Shipping marks
  if (u.includes('/api/shipping-marks')) {
    // both list and single
    return jsonResponse([
      { _id: '1', markId: 'UX0099', name: 'Company HQ', fullAddress: '123 Example St', shippingMark: 'UX0099:Jane Doe', createdAt: new Date().toISOString() },
      { _id: '2', markId: 'UX0088', name: 'Remote Site', fullAddress: '456 Example Ave', shippingMark: 'UX0088:Jane Doe', createdAt: new Date().toISOString() },
    ]);
  }

  // Trackings
  if (u.includes('/api/trackings')) {
    // list or detail
    return jsonResponse({
      data: [
        { trackingNumber: 'TRK12345678', sender: 'Alice Logistics', status: 'In Transit', product: 'Electronics', quantity: 5, addedDate: new Date().toISOString(), lastUpdated: new Date().toISOString(), statusHistory: [], _id: '1' },
        { trackingNumber: 'TRK87654321', sender: 'Bob Exports', status: 'Delivered', product: 'Shoes', quantity: 2, addedDate: new Date().toISOString(), lastUpdated: new Date().toISOString(), statusHistory: [], _id: '2' },
      ],
    });
  }

  // Training content
  if (u.includes('/api/training-courses')) {
    return jsonResponse([
      { _id: 'c1', title: 'Import Basics', description: 'Learn essentials of importing goods.', price: 29.99, duration: '1h 20m', thumbnail: 'https://via.placeholder.com/400x225?text=Import+Basics', videoUrl: '#' },
    ]);
  }
  if (u.includes('/api/youtube-videos')) {
    return jsonResponse([
      { _id: 'y1', title: 'Getting Started with Importing', description: 'Free intro video', thumbnail: 'https://via.placeholder.com/400x225?text=YouTube', videoUrl: 'https://youtube.com' },
    ]);
  }

  // Quick order products, buy4me requests
  if (u.includes('/api/quick-order-products')) {
    return jsonResponse([
      { _id: 'p1', title: 'Gaming Laptop', description: 'High-performance laptop', images: [], minQuantity: 20, link: 'https://example.com' },
    ]);
  }
  if (u.includes('/api/buy4me-requests')) {
    // POST/PUT return the request back
    const body = (init && init.body) ? JSON.parse(init.body) : {};
    return jsonResponse({ _id: 'req1', ...body, title: body.title || 'Buy4me Request' });
  }

  // Default: succeed with empty object to avoid crashes
  return jsonResponse({});
}

// Patch window.fetch
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (url, init) => {
    try {
      if (String(url).includes('/api/')) {
        return buildMockData(url, init);
      }
      return originalFetch(url, init);
    } catch (e) {
      return jsonResponse({});
    }
  };
}

// Patch axios methods
const mockAxios = async (method, url, configOrData) => {
  // Reuse fetch mock to build consistent shapes
  const resp = buildMockData(url, { method, body: typeof configOrData === 'string' ? configOrData : JSON.stringify(configOrData && configOrData.data) });
  const data = await resp.json();
  return { data, status: resp.status, statusText: 'OK', headers: {}, config: {} };
};

axios.get = (url, config) => mockAxios('GET', url, config);
axios.post = (url, data, config) => mockAxios('POST', url, { ...(config||{}), data });
axios.put = (url, data, config) => mockAxios('PUT', url, { ...(config||{}), data });
axios.delete = (url, config) => mockAxios('DELETE', url, config);


