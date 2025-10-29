import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Category from "./Category";
import Product from "./Product";
import Order from "./Order";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import CreateOrder from "./pages/CreateOrder";
import EditOrder from "./pages/EditOrder";
import Quotation from "./pages/Quotation";
import QuotationList from "./pages/QuotationList";
import SharedQuotation from "./pages/SharedQuotation";
import SharedOrder from "./pages/SharedOrder";
import ViewPDF from "./pages/ViewPDF";
import OrderPDF from "./pages/OrderPDF";
import BulkImport from "./pages/BulkImport";

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)
  const location = useLocation()
  
  // Check if current route is a shared PDF route
  const isSharedRoute = location.pathname.startsWith('/shared-quotation') || location.pathname.startsWith('/shared-order')
  
  // If it's a shared route, render only the content without sidebar
  if (isSharedRoute) {
    return (
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/shared-quotation/:id" element={<SharedQuotation />} />
          <Route path="/shared-order/:id" element={<SharedOrder />} />
        </Routes>
      </div>
    )
  }

  // Regular app layout with sidebar
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} w-full transition-all duration-300`}>
        {/* Mobile hamburger menu button */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Computer Shop</h1>
          <div className="w-10"></div>
        </div>
        
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<div className="p-2 sm:p-4 lg:p-6"><Dashboard /></div>} />
          <Route path="/categories" element={<div className="p-2 sm:p-4 lg:p-6"><Category /></div>} />
          <Route path="/products" element={<div className="p-2 sm:p-4 lg:p-6"><Product /></div>} />
          <Route path="/add-product" element={<div className="p-2 sm:p-4 lg:p-6"><AddProduct /></div>} />
          <Route path="/edit-product/:id" element={<div className="p-2 sm:p-4 lg:p-6"><EditProduct /></div>} />
          <Route path="/orders" element={<div className="p-2 sm:p-4 lg:p-6"><Order /></div>} />
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/edit-order/:id" element={<div className="p-2 sm:p-4 lg:p-6"><EditOrder /></div>} />
          <Route path="/quotation" element={<div className="p-2 sm:p-4 lg:p-6"><Quotation /></div>} />
          <Route path="/quotation-list" element={<div className="p-2 sm:p-4 lg:p-6"><QuotationList /></div>} />
          <Route path="/bulk-import" element={<div className="p-2 sm:p-4 lg:p-6"><BulkImport /></div>} />
          <Route path="/view-pdf/:id" element={<ViewPDF />} />
          <Route path="/order-pdf/:id" element={<OrderPDF />} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </Router>
  )
}

export default App;


//https://computer-b.vercel.app
//https://computer-b.vercel.app