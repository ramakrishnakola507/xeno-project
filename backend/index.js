// --- Part 1: Setup and Initialization ---
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const cron = require('node-cron');
const fetch = require('node-fetch'); // Use specific version for compatibility

const app = express();
const prisma = new PrismaClient();

// --- Part 2: Middlewares (ORDER IS IMPORTANT) ---
// This must come BEFORE any of your API routes to work correctly.
app.use(cors());
app.use(express.json());

// --- Part 3: API Endpoints for our Frontend ---

// 1. Login Endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.password === password) {
        res.json({ message: 'Login successful', storeId: user.storeId });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// 2. Endpoint to SAVE the API Token from the dashboard
app.post('/api/save-token', async (req, res) => {
    const { storeId, apiToken } = req.body;
    if (!storeId || !apiToken) {
        return res.status(400).json({ error: 'Store ID and Token are required' });
    }
    try {
        await prisma.store.update({
            where: { id: parseInt(storeId) },
            data: { apiToken: apiToken },
        });
        res.json({ message: 'API Token saved successfully!' });
    } catch (error) {
        console.error("Failed to save token:", error);
        res.status(500).json({ error: 'Failed to save token.' });
    }
});

// 3. Main dashboard stats
app.get('/api/stats/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    // ... (rest of the code is the same)
    const totalCustomers = await prisma.customer.count({ where: { storeId } });
    const totalOrders = await prisma.order.count({ where: { storeId } });
    const totalRevenue = await prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { storeId },
    });
    res.json({
        totalCustomers,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
    });
});

// 4. Top 5 customers
app.get('/api/top-customers/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    // ... (rest of the code is the same)
    const orders = await prisma.order.findMany({
        where: { storeId },
        include: { customer: true },
    });
    const customerSpend = {};
    orders.forEach(order => {
        if (order.customer) { // Safety check
            if (!customerSpend[order.customerId]) {
                customerSpend[order.customerId] = {
                    name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email,
                    total: 0,
                };
            }
            customerSpend[order.customerId].total += order.totalPrice;
        }
    });
    const sortedCustomers = Object.values(customerSpend).sort((a, b) => b.total - a.total).slice(0, 5);
    res.json(sortedCustomers);
});

// 5. Orders by Date Endpoint
app.get('/api/orders-by-date/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required.' });
    }

    try {
        const orders = await prisma.order.findMany({
            where: {
                storeId: storeId,
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const dailyData = {};
        orders.forEach(order => {
            const date = order.createdAt.toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { date, orders: 0, revenue: 0 };
            }
            dailyData[date].orders += 1;
            dailyData[date].revenue = parseFloat((dailyData[date].revenue + order.totalPrice).toFixed(2));
        });
        
        const chartData = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(chartData);

    } catch (error) {
        console.error("Error fetching orders by date:", error);
        res.status(500).json({ error: 'Failed to fetch data.' });
    }
});


// 6. Test user setup
app.get('/api/setup-test-user', async (req, res) => {
    try {
        const shopDomain = 'ramakrishna-demo.myshopify.com';
        let store = await prisma.store.findUnique({ where: { shopDomain } });
        if (!store) {
            store = await prisma.store.create({ data: { shopDomain, accessToken: 'dummy-token' } });
        }
        const user = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: { storeId: store.id },
            create: { email: 'test@example.com', password: 'password123', storeId: store.id },
        });
        res.json({ message: 'Test user ready!', user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Part 4: The Scheduler (Data Ingestion) ---
async function syncShopifyData() {
    console.log('Scheduler running: Starting data sync...');
    // ... (rest of the code is the same)
    const stores = await prisma.store.findMany({
        where: { apiToken: { not: null } },
    });

    for (const store of stores) {
        console.log(`Syncing data for ${store.shopDomain}`);
        const headers = { 'X-Shopify-Access-Token': store.apiToken };
        
        try {
            const ordersResponse = await fetch(`https://${store.shopDomain}/admin/api/2025-07/orders.json`, { headers });
            const { orders } = await ordersResponse.json();

            if (orders) {
                for (const order of orders) {
                    if (order.customer) { // Safety check
                        await prisma.customer.upsert({
                            where: { id_storeId: { id: String(order.customer.id), storeId: store.id } },
                            update: {
                                email: order.customer.email,
                                firstName: order.customer.first_name,
                                lastName: order.customer.last_name,
                            },
                            create: {
                                id: String(order.customer.id),
                                email: order.customer.email,
                                firstName: order.customer.first_name,
                                lastName: order.customer.last_name,
                                storeId: store.id,
                            },
                        });
                        
                        await prisma.order.upsert({
                            where: { id_storeId: { id: String(order.id), storeId: store.id } },
                            update: { totalPrice: parseFloat(order.total_price) },
                            create: {
                                id: String(order.id),
                                totalPrice: parseFloat(order.total_price),
                                createdAt: new Date(order.created_at),
                                storeId: store.id,
                                customerId: String(order.customer.id),
                            },
                        });
                    }
                }
                console.log(`Synced ${orders.length} orders for ${store.shopDomain}`);
            }
        } catch (error) {
            console.error(`Error syncing data for ${store.shopDomain}:`, error);
        }
    }
     console.log('Scheduler finished.');
}

// Schedules the sync to run every 2 minutes.
cron.schedule('*/2 * * * *', syncShopifyData);

// --- Part 5: Start the Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Scheduler is active. First data sync will run on the next cycle.');
});

