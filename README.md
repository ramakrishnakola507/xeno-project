Xeno FDE Internship Assignment – Shopify Data & Insights Service
This project is a multi-tenant Shopify Data Ingestion & Insights Service built as a solution to the Xeno Forward Deployed Engineer (FDE) Internship assignment. It simulates how Xeno helps enterprise retailers onboard, integrate, and analyze their customer data by connecting to a Shopify store, ingesting core business data, and presenting it in a clean, interactive dashboard.

✨ Features
Multi-Tenant Architecture: The service is designed to support multiple Shopify stores, with all data correctly isolated by a storeId.

Automated Data Ingestion: A background scheduler runs every two minutes to automatically pull the latest data from the Shopify Admin API.

Core Data Sync: Ingests and stores key business entities:

Customers

Orders

Products

Secure Authentication: The dashboard is protected by email and password authentication.

Insights Dashboard: A clean, professional UI built with React that visualizes key metrics:

Total Revenue, Total Orders, and Total Customers.

Top 5 Customers by total spend.

An interactive chart showing Orders and Revenue over time, with a filterable date range.

Professional Deployment: The backend is deployed on Render and the frontend is deployed on Vercel, demonstrating a modern, decoupled architecture.

🛠️ Tech Stack & Tools
Category

Technology

Frontend

React.js (Vite), Tailwind CSS, Recharts

Backend

Node.js, Express.js

Database

PostgreSQL

ORM

Prisma

Scheduler

node-cron

Deployment

Frontend on Vercel, Backend on Render, Database on Railway

🏛️ High-Level Architecture
The application follows a modern, decoupled, three-tier architecture.

+----------------+      +-------------------------+      +-------------------+
| Shopify Store  |----->|   Shopify Admin API     |----->|   Our Backend     |
| (Source of Truth)|      |   (Data Source)         |      |  (Node.js on Render)  |
+----------------+      +-------------------------+      +---------+---------+
                                                                   | (Pulls data every 2 mins)
                                                                   |
                                                                   v
+-----------------+      +-------------------------+      +---------+---------+
|   User Browser  |<-----|  Frontend Dashboard     |<-----|   Our Database    |
| (Viewing App)   |      |  (React on Vercel)      |      | (PostgreSQL on Railway)|
+-----------------+      +-------------------------+      +-------------------+

⚙️ Local Development Setup
Follow these instructions to run the project on your local machine.

Prerequisites
Node.js (v20.x or higher recommended)

A Shopify Partner Account and a Development Store with dummy data.

A free Railway account for a PostgreSQL database.

1. Backend Setup
Clone the repository:

git clone [https://github.com/ramakrishnakola507/xeno-project/tree/main/backend]
cd xeno-project/backend

Install dependencies:

npm install

Set up the database:

Create a new PostgreSQL database on Railway and get the Database URL.

In the backend folder, create a .env file (backend/.env).

Add your database URL to the .env file:

DATABASE_URL="postgresql://postgres:QlhpwBFQkpVjPxabnNCTVnVfrIwOetjB@caboose.proxy.rlwy.net:58588/railway"

Run the database migration: This will create all the necessary tables.

npx prisma migrate dev

Start the backend server:

npm run dev

The backend will now be running, typically on http://localhost:3001.

2. Frontend Setup
Navigate to the frontend directory:

# From the root 'xeno-project' folder
cd frontend

Install dependencies:

npm install

Connect to the backend:

Open the file frontend/src/App.jsx.

Find the API_BASE_URL constant and ensure it points to your locally running backend server (e.g., http://localhost:3001).

Start the frontend development server:

npm run dev

The React application will now be running, typically on http://localhost:5173.

🗄️ Database Schema (Prisma)
The multi-tenant database schema is defined in backend/prisma/schema.prisma.

// datasource, generator...

model Store {
  id          Int        @id @default(autoincrement())
  shopDomain  String     @unique
  accessToken String
  apiToken    String?
  customers   Customer[]
  orders      Order[]
  users       User[]
}

model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  password  String
  storeId   Int
  store     Store   @relation(fields: [storeId], references: [id])
}

model Customer {
  id          String  @id
  firstName   String?
  lastName    String?
  email       String?
  totalSpent  Float   @default(0)
  storeId     Int
  store       Store   @relation(fields: [storeId], references: [id])
  orders      Order[]
  @@unique([id, storeId])
}

model Order {
  id          String    @id
  totalPrice  Float
  createdAt   DateTime
  customerId  String?
  customer    Customer? @relation(fields: [customerId, storeId], references: [id, storeId])
  storeId     Int
  store       Store     @relation(fields: [storeId], references: [id])
  @@unique([id, storeId])
}
