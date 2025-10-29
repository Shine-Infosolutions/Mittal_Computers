import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { formatIndianCurrency } from './utils/formatters';

// Lazy load everything
const ChartJS = lazy(() => import('chart.js'));
const Bar = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Bar })));
const Doughnut = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Doughnut })));

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Register charts lazily
let chartsRegistered = false;
const registerCharts = async () => {
  if (chartsRegistered) return;
  const { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } = await import('chart.js');
  Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
  chartsRegistered = true;
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCategories: 0,
    yearlyOrders: Array(12).fill(0),
    yearlySales: Array(12).fill(0),
    categoryProducts: [],
    totalYearlyOrders: 0,
    totalYearlySales: 0
  });
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [selectedOrderCategory, setSelectedOrderCategory] = useState('');
  const [selectedSalesCategory, setSelectedSalesCategory] = useState('');
  const [filteredOrdersData, setFilteredOrdersData] = useState(Array(12).fill(0));
  const [filteredSalesData, setFilteredSalesData] = useState(Array(12).fill(0));
  const [loading, setLoading] = useState(false); // Start with false for instant render
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load data in background without blocking UI
    fetchDashboardData();
    // Register charts in parallel
    registerCharts().then(() => setChartsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedOrderCategory && allOrders.length > 0) {
      const filteredData = filterOrdersByCategory(selectedOrderCategory, 'orders');
      setFilteredOrdersData(filteredData);
    } else if (!selectedOrderCategory && allOrders.length > 0) {
      // Reset to all orders
      setFilteredOrdersData(stats.yearlyOrders);
    }
  }, [selectedOrderCategory, allOrders, stats.yearlyOrders]);

  useEffect(() => {
    if (selectedSalesCategory && allOrders.length > 0) {
      const filteredData = filterOrdersByCategory(selectedSalesCategory, 'sales');
      setFilteredSalesData(filteredData);
    } else if (!selectedSalesCategory && allOrders.length > 0) {
      // Reset to all sales
      setFilteredSalesData(stats.yearlySales);
    }
  }, [selectedSalesCategory, allOrders, stats.yearlySales]);

  const filterOrdersByCategory = (categoryId, type) => {
    const currentYear = new Date().getFullYear();
    const monthlyData = Array(12).fill(0);
    
    allOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate.getFullYear() === currentYear) {
        const month = orderDate.getMonth();
        
        // Check if order has items from the selected category
        const hasCategory = order.items?.some(item => 
          item.product?.category === categoryId || item.product?.category?._id === categoryId
        );
        
        if (hasCategory) {
          if (type === 'orders') {
            monthlyData[month]++;
          } else {
            const orderTotal = order.items
              ?.filter(item => item.product?.category === categoryId || item.product?.category?._id === categoryId)
              ?.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0) || 0;
            monthlyData[month] += orderTotal;
          }
        }
      }
    });
    
    return monthlyData;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check cache first
      const cacheKey = 'dashboard-data';
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        const { categoriesData, ordersResponse, products } = cached.data;
        processData(categoriesData, ordersResponse, products);
        setLoading(false);
        return;
      }

      // Fetch with proper error handling
      const fetchData = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        } catch (error) {
          console.warn(`Failed to fetch ${url}:`, error);
          return null;
        }
      };

      const [categoriesData, ordersResponse, products] = await Promise.all([
        fetchData('https://computer-b.vercel.app/api/categories/all'),
        fetchData('https://computer-b.vercel.app/api/orders/get'),
        fetchData('https://computer-b.vercel.app/api/products/all')
      ]);
      
      // Only cache if we have valid data
      if (categoriesData || ordersResponse || products) {
        cache.set(cacheKey, {
          data: { categoriesData, ordersResponse, products },
          timestamp: Date.now()
        });
      }
      
      processData(categoriesData, ordersResponse, products);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't show error if we have some cached data
      if (!cache.has(cacheKey)) {
        setError('Network error - using offline mode');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const processData = (categoriesData, ordersResponse, products) => {
    // Handle null/undefined data gracefully
    const categories = categoriesData ? 
      (Array.isArray(categoriesData) ? categoriesData : 
       (categoriesData?.categories || categoriesData?.data || [])) : [];
    
    const orders = ordersResponse ? 
      (ordersResponse.orders || ordersResponse.data || []) : [];
    setAllOrders(orders);
    
    // Ultra-fast processing with minimal operations
    const currentYear = new Date().getFullYear()
    const monthlyOrders = new Array(12).fill(0)
    const monthlySales = new Array(12).fill(0)
    let totalOrdersCount = 0
    let totalSalesAmount = 0

    // Single loop for maximum performance
    for (const order of orders) {
      if (order.type === 'Quotation') continue;
      
      const orderDate = new Date(order.createdAt);
      if (orderDate.getFullYear() !== currentYear) continue;
      
      const month = orderDate.getMonth();
      monthlyOrders[month]++;
      totalOrdersCount++;
      
      const orderTotal = order.items?.reduce((sum, item) => 
        sum + (item.price || 0) * (item.quantity || 0), 0) || 0;
      monthlySales[month] += orderTotal;
      totalSalesAmount += orderTotal;
    }

    // Fast category processing with null safety
    const categoryCount = {};
    const productList = products?.data || products || [];
    const productsCount = Array.isArray(productList) ? productList.length : 0;
    
    console.log('Products count from API:', productsCount);
    setTotalProducts(productsCount);
    
    if (Array.isArray(productList)) {
      for (const product of productList) {
        const categoryName = product?.category?.name || 'Uncategorized';
        categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
      }
    }

    const newStats = {
      totalCategories: categories.length,
      yearlyOrders: monthlyOrders,
      yearlySales: monthlySales,
      categoryProducts: Object.entries(categoryCount),
      totalYearlyOrders: totalOrdersCount,
      totalYearlySales: totalSalesAmount
    };
    
    setFilteredOrdersData(monthlyOrders);
    setFilteredSalesData(monthlySales);
    setCategories(categories);
    setStats(newStats);
  };

  const currentYear = new Date().getFullYear();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const ordersChartData = useMemo(() => ({
    labels: months,
    datasets: [{
      label: selectedOrderCategory ? `Orders - ${categories.find(c => c._id === selectedOrderCategory)?.name || 'Category'}` : 'Monthly Orders',
      data: filteredOrdersData,
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }],
  }), [filteredOrdersData, selectedOrderCategory, categories]);

  const salesChartData = useMemo(() => ({
    labels: months,
    datasets: [{
      label: selectedSalesCategory ? `Sales - ${categories.find(c => c._id === selectedSalesCategory)?.name || 'Category'}` : 'Monthly Sales (₹)',
      data: filteredSalesData,
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderColor: 'rgba(34, 197, 94, 1)',
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }],
  }), [filteredSalesData, selectedSalesCategory, categories]);

  const categoryChartData = useMemo(() => ({
    labels: stats.categoryProducts.map(([category]) => category),
    datasets: [{
      data: stats.categoryProducts.map(([, count]) => count),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
        '#84CC16', '#F97316', '#EC4899', '#6B7280'
      ],
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverBorderWidth: 3,
    }],
  }), [stats.categoryProducts]);

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    cutout: '60%',
  };

  // Skeleton component for instant loading
  const SkeletonCard = () => (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <div className={`h-4 bg-gray-200 rounded mb-2 ${loading ? 'animate-pulse' : ''}`}></div>
      <div className={`h-8 bg-gray-200 rounded ${loading ? 'animate-pulse' : ''}`}></div>
    </div>
  );
  
  const SkeletonChart = () => (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
      <div className={`h-6 bg-gray-200 rounded mb-4 w-1/3 ${chartsLoading ? 'animate-pulse' : ''}`}></div>
      <div className={`h-48 sm:h-64 bg-gray-100 rounded ${chartsLoading ? 'animate-pulse' : ''}`}></div>
    </div>
  );

  // Show error as notification, not blocking UI
  const ErrorNotification = () => error ? (
    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
      <div className="flex justify-between items-center">
        <span>{error}</span>
        <button 
          onClick={() => { setError(null); fetchDashboardData(); }}
          className="ml-2 px-2 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
        >
          Retry
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Dashboard</h1>
      <ErrorNotification />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {loading ? (
          <>  
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-600">Total Categories</h3>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.totalCategories}</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-600">Total Orders (Yearly)</h3>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.totalYearlyOrders || 0}</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-600">Total Sales (Yearly)</h3>
              <p className="text-xl sm:text-3xl font-bold text-purple-600">{formatIndianCurrency(stats.totalYearlySales || 0)}</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-600">Total Products</h3>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">{totalProducts}</p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {loading ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
            <div className="lg:col-span-2"><SkeletonChart /></div>
          </>
        ) : (
          <>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Yearly Orders</h3>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
          <div className="mb-4">
            <select
              value={selectedOrderCategory}
              onChange={(e) => {
                setSelectedOrderCategory(e.target.value);
                if (!e.target.value) {
                  fetchDashboardData();
                }
              }}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="h-48 sm:h-64">
            {chartsLoading ? (
              <div className="h-full bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <div className="text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <Suspense fallback={<div className="h-full bg-gray-100 rounded animate-pulse"></div>}>
                <Bar data={ordersChartData} options={barChartOptions} />
              </Suspense>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Yearly Sales</h3>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="mb-4">
            <select
              value={selectedSalesCategory}
              onChange={(e) => {
                setSelectedSalesCategory(e.target.value);
                if (!e.target.value) {
                  fetchDashboardData();
                }
              }}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="h-48 sm:h-64">
            {chartsLoading ? (
              <div className="h-full bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <div className="text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <Suspense fallback={<div className="h-full bg-gray-100 rounded animate-pulse"></div>}>
                <Bar data={salesChartData} options={barChartOptions} />
              </Suspense>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Products by Category</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Distribution</span>
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            </div>
          </div>
          <div className="h-48 sm:h-64">
            {chartsLoading ? (
              <div className="h-full bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <div className="text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <Suspense fallback={<div className="h-full bg-gray-100 rounded animate-pulse"></div>}>
                <Doughnut data={categoryChartData} options={doughnutOptions} />
              </Suspense>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;