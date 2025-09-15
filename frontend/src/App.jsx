import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- CONFIGURATION ---
// IMPORTANT: Make sure this is your correct backend URL from Render.
const API_BASE_URL = 'https://xeno-project-xjtn.onrender.com';

// --- SVG Icons (for a professional look) ---
const DollarSignIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);
const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

// --- Reusable UI Components ---
const StatCard = ({ title, value, icon, isLoading }) => (
  <div className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4">
    <div className="bg-slate-100 p-3 rounded-lg">
        {icon}
    </div>
    <div className="flex-1">
        <h2 className="text-sm font-medium text-slate-500 truncate">{title}</h2>
        {isLoading ? <div className="h-9 mt-1 bg-slate-200 rounded animate-pulse"></div> : <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>}
    </div>
  </div>
);

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return <div className="text-red-500 text-sm mb-4 text-center min-h-[20px]">{message}</div>;
};

// --- Page Components ---

const AuthPageWrapper = ({ children }) => (
    <div className="relative w-full max-w-md mx-auto">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-2000 -translate-x-20 -translate-y-40"></div>
        <div className="relative">
            {children}
        </div>
    </div>
);


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
    <AuthPageWrapper>
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-lg">
            <h1 className="text-3xl font-bold text-center mb-2 text-slate-900">Welcome Back</h1>
            <p className="text-slate-500 text-center mb-6">Log in to your Xeno Insights dashboard.</p>
            <ErrorMessage message={error} />
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* ... form fields are the same ... */}
                 <div>
                    <label htmlFor="email" className="text-sm font-medium text-slate-600">Email</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white/50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
                </div>
                <div>
                    <label htmlFor="password" className="text-sm font-medium text-slate-600">Password</label>
                    <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white/50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white py-3 px-4 rounded-md hover:from-indigo-700 hover:to-violet-700 font-semibold disabled:from-indigo-400 disabled:to-violet-400 transition-all duration-300 transform hover:scale-105">
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    </AuthPageWrapper>
  );
};

const ApiSetupPage = ({ storeId, onTokenSaved }) => {
  const [apiToken, setApiToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveToken = async () => {
    // ... logic is the same ...
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
    <AuthPageWrapper>
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-lg">
            <h1 className="text-3xl font-bold text-center mb-2 text-slate-900">One-Time Setup</h1>
            <p className="text-slate-500 text-center mb-6">Provide your Shopify Admin API token to begin.</p>
            <ErrorMessage message={error} />
            <div className="space-y-4">
                {/* ... form fields are the same ... */}
                <div>
                    <label htmlFor="api-token" className="text-sm font-medium text-slate-600">Admin API Access Token</label>
                    <input type="text" id="api-token" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="shpat_..." className="mt-1 block w-full px-3 py-2 bg-white/50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <button onClick={handleSaveToken} disabled={isLoading} className="w-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white py-3 px-4 rounded-md hover:from-indigo-700 hover:to-violet-700 font-semibold disabled:from-indigo-400 disabled:to-violet-400 transition-all duration-300 transform hover:scale-105">
                    {isLoading ? 'Saving...' : 'Save Token & Sync Data'}
                </button>
            </div>
        </div>
    </AuthPageWrapper>
  );
};

const OrdersByDateChart = ({ storeId }) => {
    // ... logic is the same ...
    const today = new Date();
    today.setDate(today.getDate()); 
    const todayString = today.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(sevenDaysAgo);
    const [endDate, setEndDate] = useState(todayString);
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchChartData = async () => {
        if (!storeId || !startDate || !endDate) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders-by-date/${storeId}?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) throw new Error('Could not fetch chart data.');
            const data = await response.json();
            setChartData(data);
        } catch (err) { setError(err.message); } 
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchChartData();
    }, [storeId]);
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Orders & Revenue Trend</h2>
            <form onSubmit={(e) => { e.preventDefault(); fetchChartData(); }} className="flex flex-wrap gap-4 items-center mb-6">
                 {/* ... form fields are the same, just slightly restyled ... */}
                 <div>
                    <label htmlFor="start-date" className="text-xs text-slate-500">Start Date</label>
                    <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-300 rounded-md p-2 text-sm w-full"/>
                </div>
                <div>
                    <label htmlFor="end-date" className="text-xs text-slate-500">End Date</label>
                    <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-300 rounded-md p-2 text-sm w-full"/>
                </div>
                <button type="submit" disabled={isLoading} className="self-end bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-semibold text-sm disabled:bg-indigo-400 transition-transform transform hover:scale-105">
                    {isLoading ? 'Loading...' : 'Filter'}
                </button>
            </form>
            {error && <p className="text-red-500 text-center py-8">{error}</p>}
            <div style={{ width: '100%', height: 300 }}>
                 <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} tickFormatter={(value) => `$${value}`} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} />
                        <Tooltip formatter={(value, name) => name === 'Revenue' ? `$${value.toFixed(2)}` : value} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Revenue" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} name="Orders" dot={{ r: 4 }} activeDot={{ r: 6 }}/>
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
    // ... data fetching logic is the same ...
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
        <StatCard title="Total Revenue" value={`$${(stats.totalRevenue || 0).toFixed(2)}`} icon={<DollarSignIcon />} isLoading={isLoadingStats} />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={<ShoppingCartIcon />} isLoading={isLoadingStats} />
        <StatCard title="Total Customers" value={stats.totalCustomers} icon={<UsersIcon />} isLoading={isLoadingStats} />
      </div>
      
      <OrdersByDateChart storeId={storeId} />
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Top 5 Customers by Spend</h2>
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

function App() {
  const [storeId, setStoreId] = useState(sessionStorage.getItem('storeId'));
  const [needsTokenSetup, setNeedsTokenSetup] = useState(false);

  const handleLogin = async (email, password) => {
    // ... logic is the same ...
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
    setNeedsTokenSetup(true);
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
    <div className="bg-slate-100 text-slate-800 flex items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="w-full max-w-5xl mx-auto">
        {content}
      </div>
    </div>
  );
}

export default App;
