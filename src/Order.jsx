import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import axios from 'axios'
import { formatIndianCurrency } from './utils/formatters'

const Order = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)

  useEffect(() => {
    fetchOrders(1)
  }, [])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchOrders(1)
    }, 500)
    return () => clearTimeout(delayedSearch)
  }, [searchTerm])

  const fetchOrders = async (page = 1) => {
    try {
      const response = await axios.get(`https://computer-b.vercel.app/api/orders/get?page=${page}`)
      const ordersData = response.data.orders || response.data.data || []
      console.log('Orders data:', ordersData) // Debug log
      // Filter out quotations - only show actual orders
      const actualOrders = ordersData.filter(order => order.type !== 'Quotation')
      // Sort orders by creation date (newest first)
      const sortedOrders = actualOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setOrders(sortedOrders)
      setTotalPages(response.data.totalPages || 1)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getFilteredOrders = () => {
    if (!searchTerm.trim()) return orders
    
    return orders.filter(order => 
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order._id?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleDeleteOrder = async () => {
    try {
      await axios.delete(`https://computer-b.vercel.app/api/orders/${orderToDelete}`)
      toast.success('✅ Order deleted successfully!')
      fetchOrders()
      setShowDeleteModal(false)
      setOrderToDelete(null)
    } catch (error) {
      console.error('Error deleting order:', error)
      toast.error('❌ Failed to delete order. Please try again.')
      setShowDeleteModal(false)
      setOrderToDelete(null)
    }
  }

  const exportToCSV = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/orders/export/csv')
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Orders exported to CSV successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export orders. Please try again.')
    }
  }

  const handlePrintOrder = async (order) => {
    try {
      // Fetch product details for each item
      const [productsResponse, categoriesResponse] = await Promise.all([
        axios.get('https://computer-b.vercel.app/api/products/all'),
        axios.get('https://computer-b.vercel.app/api/categories/all')
      ])
      const allProducts = productsResponse.data
      const allCategories = categoriesResponse.data
      
      const itemsWithNames = order.items?.map(item => {
        // Handle case where item.product might be an object or string
        let productName = 'Unknown Product'
        let categoryName = 'N/A'
        
        if (typeof item.product === 'object' && item.product?.name) {
          // item.product is already a product object
          productName = item.product.name
          if (item.product.category?.name) {
            categoryName = item.product.category.name
          } else if (item.product.category) {
            // category might be just an ID, look it up
            const category = allCategories.find(c => c._id === item.product.category)
            categoryName = category?.name || 'N/A'
          }
        } else if (typeof item.product === 'string') {
          // item.product is an ID, find the product
          const product = allProducts.find(p => p._id === item.product)
          productName = product?.name || `Product ${item.product}`
          if (product?.category?.name) {
            categoryName = product.category.name
          } else if (product?.category) {
            // category might be just an ID, look it up
            const category = allCategories.find(c => c._id === product.category)
            categoryName = category?.name || 'N/A'
          }
        }
        
        return {
          ...item,
          productName: productName,
          categoryName: categoryName
        }
      }) || []
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order - ${order.orderId || order._id}</title>
          <style>
            @page { margin: 0; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background: white; padding: 32px; }
            
            .header { text-align: center; margin-bottom: 48px; }
            .header h1 { font-size: 2.5rem; font-weight: bold; color: #374151; margin-bottom: 8px; }
            .header p { font-size: 1.25rem; color: #6b7280; }
            .header hr { width: 128px; margin: 16px auto; border: 1px solid #d1d5db; }
            
            .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 48px; }
            .info-section h3 { font-size: 1.25rem; font-weight: bold; color: #374151; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            .customer-info { color: #374151; }
            .customer-info p { margin: 4px 0; }
            .customer-name { font-weight: 600; font-size: 1.125rem; }
            .order-info { text-align: right; color: #374151; }
            .order-info p { margin: 4px 0; }
            .order-info span { font-weight: 500; }
            
            table { width: 100%; border-collapse: collapse; border: 2px solid #9ca3af; margin-bottom: 48px; }
            th { border: 2px solid #9ca3af; padding: 24px; color: white; background-color: #1e3a8a; font-weight: bold; }
            td { border: 1px solid #d1d5db; padding: 24px; }
            .item-row:nth-child(even) { background-color: #f9fafb; }
            .item-name { font-weight: 600; color: #374151; margin-bottom: 3px; }
            .item-category { font-size: 0.875rem; color: #6b7280; }
            .qty { text-align: center; font-weight: 500; }
            .price { text-align: right; font-weight: 500; }
            .total-cell { text-align: right; font-weight: bold; }
            
            .totals { display: flex; justify-content: flex-end; margin-bottom: 48px; }
            .totals-box { width: 320px; background-color: #f9fafb; padding: 24px; border-radius: 8px; border: 2px solid #d1d5db; }
            .totals-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #d1d5db; font-size: 1.125rem; }
            .totals-row span { font-weight: 500; }
            .totals-row.final { font-weight: bold; font-size: 1.5rem; color: #374151; border-top: 2px solid #9ca3af; margin-top: 8px; padding-top: 16px; }
            
            .footer { text-align: center; border-top: 2px solid #d1d5db; padding-top: 32px; }
            .footer p:first-child { font-size: 1.125rem; font-weight: 500; color: #374151; margin-bottom: 8px; }
            .footer p:last-child { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ORDER</h1>
            <p>Computer Shop</p>
            <hr>
          </div>
          
          <div class="info-section">
            <div>
              <h3>Bill To:</h3>
              <div class="customer-info">
                <p class="customer-name">${order.customerName}</p>
                <p>${order.customerEmail}</p>
                <p>${order.customerPhone}</p>
                <p>${order.address || 'Address not provided'}</p>
              </div>
            </div>
            <div>
              <h3 style="text-align: right;">Order Details:</h3>
              <div class="order-info">
                <p><span>Date:</span> ${new Date().toLocaleDateString()}</p>
                <p><span>Order #:</span> ${order.orderId || `#${order._id?.slice(-6)}`}</p>
                <p><span>Status:</span> Confirmed</p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsWithNames?.map((item, index) => `
                <tr class="item-row">
                  <td>
                    <div class="item-name">${item.productName}</div>
                    <div class="item-category">${item.categoryName}</div>
                  </td>
                  <td class="qty">${item.quantity}</td>
                  <td class="price">₹${item.price.toFixed(2)}</td>
                  <td class="total-cell">₹${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-box">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span>₹${order.items?.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2) || '0.00'}</span>
              </div>
              <div class="totals-row">
                <span>Tax (0%):</span>
                <span>₹0.00</span>
              </div>
              <div class="totals-row final">
                <span>TOTAL:</span>
                <span>₹${order.items?.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This order confirmation was generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
        </html>
      `
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('Print error:', error)
      toast.error('Print failed. Please try again.')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-4 sm:p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">Customer List</h1>
              <p className="text-gray-600 text-base sm:text-lg">View and manage customer orders</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <motion.button 
                onClick={exportToCSV}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                📊 Export CSV
              </motion.button>
              <motion.button 
                onClick={() => navigate('/create-order')}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-medium shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                + Create New Order
              </motion.button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <input
            type="text"
            placeholder="Search orders by customer name, email, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 shadow-sm w-full lg:w-96"
          />
          <div className="text-sm text-gray-500 w-full lg:w-auto text-left lg:text-right">
            Showing {getFilteredOrders().length} orders
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {getFilteredOrders().map((order, index) => (
          <div
            key={order._id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{order.orderId || `#${order._id?.slice(-6)}`}</h3>
                <p className="text-sm text-gray-600">{order.customerName}</p>
                <p className="text-xs text-gray-500">{order.customerEmail}</p>
              </div>
              <span className="text-lg font-bold text-gray-900">{formatIndianCurrency(order.totalAmount || 0)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <span className="text-gray-500">Items:</span>
                <p className="font-medium">{order.items?.length || 0} items</p>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            {/* <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => navigate(`/order-pdf/${order._id}`)}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                View PDF
              </button>
              <button 
                onClick={() => {
                  const shareableUrl = `${window.location.origin}/shared-order/${order._id}`
                  navigator.clipboard.writeText(shareableUrl)
                  const message = `Computer Shop Order\n\nCustomer: ${order.customerName}\nTotal: ₹${order.totalAmount?.toFixed(2)}\n\nView PDF: ${shareableUrl}`
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                  
                  setTimeout(() => {
                    if (confirm('PDF link copied! Open WhatsApp to share?')) {
                      window.open(whatsappUrl, '_blank')
                    }
                  }, 500)
                }}
                className="px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100"
              >
                Share
              </button>
              <button 
                onClick={() => navigate(`/edit-order/${order._id}`)}
                className="px-3 py-2 bg-amber-50 text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-100"
              >
                Edit
              </button>
              <button 
                onClick={() => { setOrderToDelete(order._id); setShowDeleteModal(true); }}
                className="px-3 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-100"
              >
                Delete
              </button>
            </div> */}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Address</th>
                {/* <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {getFilteredOrders().map((order, index) => (
                <tr 
                  key={order._id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-800">{order.orderId || `#${order._id?.slice(-6)}`}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-800">{order.customerName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{order.customerPhone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{order.address || 'N/A'}</div>
                  </td>
                  {/* <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate(`/order-pdf/${order._id}`)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
                      >
                        View PDF
                      </button>
                      <button 
                        onClick={() => {
                          const shareableUrl = `${window.location.origin}/shared-order/${order._id}`
                          navigator.clipboard.writeText(shareableUrl)
                          const message = `Computer Shop Order\n\nCustomer: ${order.customerName}\nTotal: ₹${order.totalAmount?.toFixed(2)}\n\nView PDF: ${shareableUrl}`
                          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                          
                          setTimeout(() => {
                            if (confirm('PDF link copied! Open WhatsApp to share?')) {
                              window.open(whatsappUrl, '_blank')
                            }
                          }, 500)
                        }}
                        className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100"
                      >
                        Share
                      </button>
                      <button 
                        onClick={() => navigate(`/edit-order/${order._id}`)}
                        className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-lg hover:bg-amber-100"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => { setOrderToDelete(order._id); setShowDeleteModal(true); }}
                        className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {getFilteredOrders().length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-500 text-lg mb-2">No orders found</p>
            <p className="text-gray-400 text-sm mb-4">Create your first order to get started</p>
            <button 
              onClick={() => navigate('/create-order')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Order
            </button>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      <div className="flex flex-wrap justify-center items-center mt-6 gap-2">
        <button
          onClick={() => fetchOrders(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => fetchOrders(page)}
            className={`px-3 py-2 rounded ${
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => fetchOrders(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Order Details - {selectedOrder._id}</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">Order Details</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(selectedOrder, null, 2)}
                </pre>
              </div>
            </div>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">₹{item.price}</td>
                          <td className="px-4 py-2 text-sm font-medium text-green-600">₹{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-red-100 transform transition-all">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Order</h3>
              <p className="text-gray-600">Are you sure you want to delete this order? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setShowDeleteModal(false); setOrderToDelete(null); }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Order
