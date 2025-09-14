// --- Part 1: Setup and Initialization ---
// We are importing all the tools we need.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors'); // Allows our frontend to talk to our backend
const cron = require('node-cron'); // The library that lets us schedule tasks
const fetch = require('node-fetch'); // A tool to make API calls to Shopify

// Create an instance of our tools
const app = express();
const prisma = new PrismaClient();

// --- Part 2: Middlewares ---
// These are functions that run on every request.
app.use(cors()); // Allow requests from any origin (for simplicity)
app.use(express.json()); // Use the standard JSON parser to understand incoming data

// --- Part 3: API Endpoints for our Frontend Dashboard ---
// These are the addresses our frontend will call to get data or save settings.

// Endpoint 1: Login for the user (this code has not changed)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.password === password) { // Simple password check
        res.json({ message: 'Login successful', storeId: user.storeId });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Endpoint 2: A NEW endpoint for the dashboard to save the Shopify API Token
app.post('/api/save-token', async (req, res) => {
    const { storeId, apiToken } = req.body;
    if (!storeId || !apiToken) {
        return res.status(400).json({ error: 'Store ID and Token are required' });
    }
    try {
        await prisma.store.update({
            where: { id: parseInt(storeId) },
            data: { apiToken: apiToken }, // Save the token to the database
        });
        res.json({ message: 'API Token saved successfully!' });
    } catch (error) {
        console.error("Failed to save token:", error);
        res.status(500).json({ error: 'Failed to save token.' });
    }
});


// Endpoint 3: Get main dashboard stats (this code has not changed)
app.get('/api/stats/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId);
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

// Endpoint 4: Get top 5 customers (this code has not changed)
app.get('/api/top-customers/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    const orders = await prisma.order.findMany({
        where: { storeId },
        include: { customer: true },
    });
    const customerSpend = {};
    orders.forEach(order => {
        if (!order.customer) return; // Skip if customer is null
        if (!customerSpend[order.customerId]) {
            customerSpend[order.customerId] = {
                name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email,
                total: 0,
            };
        }
        customerSpend[order.customerId].total += order.totalPrice;
    });
    const sortedCustomers = Object.values(customerSpend).sort((a, b) => b.total - a.total).slice(0, 5);
    res.json(sortedCustomers);
});

// Endpoint 5: Setup a test user for the dashboard (make sure the domain is correct!)
app.get('/api/setup-test-user', async (req, res) => {
    try {
        // IMPORTANT: Change this domain to match your Shopify development store's domain!
        const shopDomain = 'ramakrishna-demo.myshopify.com'; 
        let store = await prisma.store.findUnique({ where: { shopDomain } });
        if (!store) {
            store = await prisma.store.create({ data: { shopDomain, accessToken: 'dummy' } });
        }
        const user = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: {},
            create: { email: 'test@example.com', password: 'password123', storeId: store.id },
        });
        res.json({ message: 'Test user ready!', user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Part 4: The Scheduler (This is the new Data Ingestion engine) ---

// This is the main function that will pull data from Shopify
async function syncShopifyData() {
    console.log('Scheduler running: Starting data sync...');
    
    // 1. Find all stores in our database that have given us an API token.
    const stores = await prisma.store.findMany({
        where: { apiToken: { not: null } },
    });

    // 2. Loop through each store and fetch its data.
    for (const store of stores) {
        console.log(`Syncing data for ${store.shopDomain}`);
        const headers = { 'X-Shopify-Access-Token': store.apiToken };
        
        try {
            // 3. Make an API call to Shopify to get the latest 50 orders.
            const ordersResponse = await fetch(`https://${store.shopDomain}/admin/api/2025-07/orders.json?limit=50`, { headers });
            const { orders } = await ordersResponse.json();

            if (orders && orders.length > 0) {
                // 4. For each order we receive, save it (and its customer) to our database.
                for (const order of orders) {
                    if (!order.customer) continue; // Skip orders with no customer
                    
                    // First, make sure the customer exists in our DB.
                    await prisma.customer.upsert({
                        where: { id_storeId: { id: String(order.customer.id), storeId: store.id } },
                        update: { // Update details if they have changed
                            email: order.customer.email,
                            firstName: order.customer.first_name,
                            lastName: order.customer.last_name,
                        },
                        create: { // Create the customer if they are new
                            id: String(order.customer.id),
                            email: order.customer.email,
                            firstName: order.customer.first_name,
                            lastName: order.customer.last_name,
                            storeId: store.id,
                        },
                    });
                    
                    // Now, save the order itself.
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
                console.log(`Synced ${orders.length} orders for ${store.shopDomain}`);
            } else {
                console.log(`No new orders to sync for ${store.shopDomain}`);
            }
        } catch (error) {
            console.error(`Error syncing data for ${store.shopDomain}:`, error);
        }
    }
     console.log('Scheduler finished.');
}

// This line tells our server to run the 'syncShopifyData' function every 2 minutes.
// The syntax '*/2 * * * *' is called "cron syntax".
cron.schedule('*/2 * * * *', syncShopifyData);


// --- Part 5: Start the Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Scheduler is active. Data sync will run every 2 minutes.');
});
