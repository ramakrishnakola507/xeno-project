// --- Part 1: Setup and Initialization ---
// Import the tools we need
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors'); // To allow our frontend to talk to our backend

// Create an instance of our tools
const app = express();
const prisma = new PrismaClient();

// --- Part 2: Middlewares ---
// These are functions that run on every request

// Allow requests from any origin (for simplicity)
app.use(cors()); 
// This middleware is crucial. It reads the raw request body, which Shopify needs for webhook verification.
app.use(express.raw({ type: 'application/json' })); 

// --- Part 3: The Shopify Webhook Endpoint (Data Ingestion) ---
// This is where Shopify will send us data.
app.post('/webhooks/shopify', async (req, res) => {
    // We get the event type, shop domain, and data from Shopify's headers and body
    const topic = req.get('X-Shopify-Topic');
    const shop = req.get('X-Shopify-Shop-Domain');
    const data = JSON.parse(req.body.toString());

    console.log(`Webhook received! Topic: ${topic}, Shop: ${shop}`);

    // We need to make sure the store exists in our database.
    // If not, we create it. This is how a new store "onboards".
    let store = await prisma.store.findUnique({
        where: { shopDomain: shop },
    });
    if (!store) {
        store = await prisma.store.create({
            data: {
                shopDomain: shop,
                accessToken: 'dummy-token', // We don't need a real one for this setup
            },
        });
        console.log(`New store onboarded: ${shop}`);
    }

    // Now, we handle the data based on the event type ("topic")
    try {
        if (topic === 'customers/create' || topic === 'customers/update') {
            await prisma.customer.upsert({
                where: { id_storeId: { id: String(data.id), storeId: store.id } },
                update: {
                    email: data.email,
                    firstName: data.first_name,
                    lastName: data.last_name,
                },
                create: {
                    id: String(data.id),
                    email: data.email,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    storeId: store.id,
                },
            });
            console.log(`Processed customer: ${data.id}`);
        }

        if (topic === 'orders/create') {
            // First, make sure the customer from the order exists in our DB
            await prisma.customer.upsert({
                where: { id_storeId: { id: String(data.customer.id), storeId: store.id } },
                update: {
                    email: data.customer.email,
                    firstName: data.customer.first_name,
                    lastName: data.customer.last_name,
                },
                create: {
                    id: String(data.customer.id),
                    email: data.customer.email,
                    firstName: data.customer.first_name,
                    lastName: data.customer.last_name,
                    storeId: store.id,
                },
            });

            // Now, create the order
            await prisma.order.create({
                data: {
                    id: String(data.id),
                    totalPrice: parseFloat(data.total_price),
                    createdAt: new Date(data.created_at),
                    storeId: store.id,
                    customerId: String(data.customer.id),
                },
            });
            console.log(`Processed order: ${data.id}`);
        }

    } catch (error) {
        console.error("Error processing webhook:", error);
    }
    
    // IMPORTANT: We must send a 200 OK response to Shopify, or it will think the webhook failed.
    res.status(200).send();
});


// --- Part 4: API Endpoints for our Frontend Dashboard ---
// These are the addresses our frontend will call to get data.

// Middleware to parse JSON for these specific routes
const jsonParser = express.json();

// 1. Login Endpoint
app.post('/api/login', jsonParser, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (user && user.password === password) { // Simple password check (don't do this in production!)
        // In a real app, you'd send a secure token (JWT). For simplicity, we send the storeId.
        res.json({ message: 'Login successful', storeId: user.storeId });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// 2. Endpoint to get main dashboard stats
app.get('/api/stats/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
        return res.status(400).json({ error: 'Invalid store ID' });
    }

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

// 3. Endpoint to get top 5 customers by spend
app.get('/api/top-customers/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId);
     if (isNaN(storeId)) {
        return res.status(400).json({ error: 'Invalid store ID' });
    }
    
    // We get all orders and process them in code because complex queries can be hard.
    const orders = await prisma.order.findMany({
        where: { storeId },
        include: { customer: true },
    });

    const customerSpend = {};
    orders.forEach(order => {
        if (!customerSpend[order.customerId]) {
            customerSpend[order.customerId] = {
                name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email,
                total: 0,
            };
        }
        customerSpend[order.customerId].total += order.totalPrice;
    });

    const sortedCustomers = Object.values(customerSpend)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
        
    res.json(sortedCustomers);
});

// A special endpoint to create a dummy user for testing login
app.get('/api/setup-test-user', jsonParser, async (req, res) => {
    try {
        const shopDomain = 'dev-coffee-house.myshopify.com'; // CHANGE THIS if your dev store has a different domain
        let store = await prisma.store.findUnique({ where: { shopDomain } });
        if (!store) {
            store = await prisma.store.create({ data: { shopDomain, accessToken: 'dummy' } });
        }

        const user = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: {},
            create: {
                email: 'test@example.com',
                password: 'password123', // Super secure password
                storeId: store.id,
            },
        });
        res.json({ message: 'Test user ready!', user });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

// ✅ Add the root route here
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 Xeno Insights Backend is Live</h1>
    <p>Your Shopify app is running successfully on Render.</p>
    <p>Available endpoints:</p>
    <ul>
      <li>POST /webhooks/shopify</li>
      <li>POST /api/login</li>
      <li>GET /api/stats/:storeId</li>
      <li>GET /api/top-customers/:storeId</li>
      <li>GET /api/setup-test-user</li>
    </ul>
  `);
});

// --- Part 5: Start the Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
