import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- CONFIGURATION ---
// Using a direct URL to avoid build environment warnings.
// IMPORTANT: Make sure this is your correct backend URL from Render.
const API_BASE_URL = 'https://xeno-project-yjtn.onrender.com';

// --- Reusable UI Components ---
const StatCard = ({ title, value, isLoading }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm">
    <h2 className="text-sm font-medium text-slate-500 truncate">{title}</h2>
    {isLoading ? <div className="h-9 mt-1 bg-slate-200 rounded animate-pulse"></div> : <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>}
  </div>
);

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return <div className="text-red-500 text-sm mb-4 text-center min-h-[20px]">{message}</div>;
};

// --- Page Components ---

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md max-w-md mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-center mb-1 text-slate-900">Xeno Insights Login</h1>
      <p className="text-slate-500 text-center mb-6">Access your Shopify store dashboard.</p>
      <ErrorMessage message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-slate-600">Email</label>
          <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-slate-600">Password</label>
          <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
        </div>
        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-semibold disabled:bg-indigo-400">
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

const ApiSetupPage = ({ storeId, onTokenSaved }) => {
  const [apiToken, setApiToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveToken = async () => {
    if (!apiToken.startsWith('shpat_')) {
      setError('Please enter a valid Admin API token starting with "shpat_".');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/save-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: parseInt(storeId), apiToken }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save token.');
      }
      onTokenSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md max-w-md mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-center mb-1 text-slate-900">One-Time Setup</h1>
      <p className="text-slate-500 text-center mb-6">Provide your Admin API token to begin syncing data.</p>
      <ErrorMessage message={error} />
      <div className="space-y-4">
        <div>
          <label htmlFor="api-token" className="text-sm font-medium text-slate-600">Admin API Access Token</label>
          <input type="text" id="api-token" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="shpat_..." className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <button onClick={handleSaveToken} disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-semibold disabled:bg-indigo-400">
          {isLoading ? 'Saving...' : 'Save Token & Sync Data'}
        </button>
      </div>
    </div>
  );
};

// --- NEW Chart Component ---
const OrdersByDateChart = ({ storeId }) => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Include today in the range
    const todayString = today.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(sevenDaysAgo);
    const [endDate, setEndDate] = useState(todayString);
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchChartData = async () => {
        if (!storeId) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders-by-date/${storeId}?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) throw new Error('Could not fetch chart data.');
            const data = await response.json();
            setChartData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChartData();
    }, [storeId]);

    const handleFilter = (e) => {
        e.preventDefault();
        fetchChartData();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Orders & Revenue by Date</h2>
            <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-center mb-6">
                <div>
                    <label htmlFor="start-date" className="text-xs text-slate-500">Start Date</label>
                    <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-300 rounded-md p-2 text-sm w-full"/>
                </div>
                <div>
                    <label htmlFor="end-date" className="text-xs text-slate-500">End Date</label>
                    <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-300 rounded-md p-2 text-sm w-full"/>
                </div>
                <button type="submit" disabled={isLoading} className="self-end bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-semibold text-sm disabled:bg-indigo-400">
                    {isLoading ? 'Loading...' : 'Filter'}
                </button>
            </form>
            {error && <p className="text-red-500 text-center py-8">{error}</p>}
            <div style={{ width: '100%', height: 300 }}>
                 <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} tickFormatter={(value) => `$${value}`} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} />
                        <Tooltip formatter={(value, name) => name === 'Revenue' ? `$${value.toFixed(2)}` : value} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#4f4e65" strokeWidth={2} name="Revenue" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} name="Orders" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


const DashboardPage = ({ storeId, onLogout }) => {
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalCustomers: 0 });
  const [topCustomers, setTopCustomers] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/stats/${storeId}`);
        const data = await response.json();
        setStats(data);
      } catch (error) { console.error("Failed to fetch stats:", error); } 
      finally { setIsLoadingStats(false); }
    };

    const fetchTopCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/top-customers/${storeId}`);
        const data = await response.json();
        setTopCustomers(data);
      } catch (error) { console.error("Failed to fetch top customers:", error); } 
      finally { setIsLoadingCustomers(false); }
    };

    fetchStats();
    fetchTopCustomers();
  }, [storeId]);

  return (
    <div className="w-full animate-fade-in space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <button onClick={onLogout} className="text-sm text-slate-600 hover:text-indigo-600 font-medium">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Revenue" value={`$${(stats.totalRevenue || 0).toFixed(2)}`} isLoading={isLoadingStats} />
        <StatCard title="Total Orders" value={stats.totalOrders} isLoading={isLoadingStats} />
        <StatCard title="Total Customers" value={stats.totalCustomers} isLoading={isLoadingStats} />
      </div>

      {/* --- THIS IS WHERE THE NEW CHART IS ADDED --- */}
      <OrdersByDateChart storeId={storeId} />

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Customers by Spend</h2>
        {isLoadingCustomers ? (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-200 rounded animate-pulse"></div>)}
            </div>
        ) : topCustomers.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {topCustomers.map((customer, index) => (
              <li key={index} className="flex justify-between items-center py-3">
                <span className="text-slate-600">{customer.name}</span>
                <span className="font-semibold text-slate-800">${customer.total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-center py-4">No customer data available yet.</p>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [storeId, setStoreId] = useState(sessionStorage.getItem('storeId'));
  const [needsTokenSetup, setNeedsTokenSetup] = useState(false);

  const handleLogin = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Invalid credentials');
    }
    const data = await response.json();
    sessionStorage.setItem('storeId', data.storeId);
    setStoreId(data.storeId);
    setNeedsTokenSetup(true); // Always go to token setup after login
  };

  const handleLogout = () => {
    sessionStorage.removeItem('storeId');
    setStoreId(null);
    setNeedsTokenSetup(false);
  };

  const handleTokenSaved = () => {
    setNeedsTokenSetup(false);
  };

  let content;
  if (storeId && !needsTokenSetup) {
    content = <DashboardPage storeId={storeId} onLogout={handleLogout} />;
  } else if (storeId && needsTokenSetup) {
    content = <ApiSetupPage storeId={storeId} onTokenSaved={handleTokenSaved} />;
  } else {
    content = <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="bg-slate-50 text-slate-800 flex items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="w-full max-w-5xl mx-auto">
        {content}
      </div>
    </div>
  );
}

export default App;

