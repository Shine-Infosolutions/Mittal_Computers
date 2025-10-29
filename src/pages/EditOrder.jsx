import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import axios from 'axios'

const EditOrder = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [originalProducts, setOriginalProducts] = useState([])
  const [compatibleProducts, setCompatibleProducts] = useState([])
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [showCompatible, setShowCompatible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingProduct, setPendingProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orderType, setOrderType] = useState('Order')

  useEffect(() => {
    fetchOrder()
    fetchProducts()
    fetchCategories()
  }, [id])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchProducts()
    }, 500)
    return () => clearTimeout(delayedSearch)
  }, [searchTerm, selectedCategory])

  useEffect(() => {
    fetchCompatibleProducts()
  }, [selectedProducts])

  const fetchCompatibleProducts = async () => {
    if (selectedProducts.length === 0) {
      setShowCompatible(false)
      setCompatibleProducts([])
      return
    }

    try {
      const compatibleProductsSet = new Set()
      
      for (const product of selectedProducts) {
        const response = await axios.get(`https://computer-b.vercel.app/api/products/${product._id}/compatible`)
        if (response.data && response.data.length > 0) {
          response.data.forEach(compatibleProduct => {
            if (!selectedProducts.some(selected => selected._id === compatibleProduct._id)) {
              compatibleProductsSet.add(JSON.stringify(compatibleProduct))
            }
          })
        }
      }
      
      const uniqueCompatibleProducts = Array.from(compatibleProductsSet).map(item => JSON.parse(item))
      setCompatibleProducts(uniqueCompatibleProducts)
      setShowCompatible(uniqueCompatibleProducts.length > 0)
    } catch (error) {
      console.error('Error fetching compatible products:', error)
      setCompatibleProducts([])
      setShowCompatible(false)
    }
  }

  const fetchOrder = async () => {
    try {
      const [orderResponse, productsResponse] = await Promise.all([
        axios.get(`https://computer-b.vercel.app/api/orders/get`),
        axios.get('https://computer-b.vercel.app/api/products/all')
      ])
      
      const order = orderResponse.data.data?.find(o => o._id === id)
      const allProducts = productsResponse.data
      
      if (order) {
        setOrderType(order.type || 'Order')
        setCustomerInfo({
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          address: order.address || ''
        })
        
        const orderProducts = order.items?.map(item => {
          let productData = null
          let productId = item.product
          
          if (typeof item.product === 'object' && item.product?.name) {
            productData = item.product
            productId = item.product._id
          } else if (typeof item.product === 'string') {
            productData = allProducts.find(p => p._id === item.product)
            productId = item.product
          }
          
          console.log('Loading order item:', item, 'quantity:', item.quantity)
          
          return {
            _id: productId,
            name: productData?.name || 'Unknown Product',
            sellingRate: item.price || productData?.sellingRate || 0,
            orderQuantity: parseInt(item.quantity) || 0,
            category: productData?.category,
            brand: productData?.brand,
            quantity: productData?.quantity || 0
          }
        }) || []
        
        setSelectedProducts(orderProducts)
        // Use current order quantities as the new baseline for stock calculations
        setOriginalProducts(orderProducts.map(p => ({ ...p, orderQuantity: p.orderQuantity })))
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      let url
      
      // Determine which API to use based on filters
      if (searchTerm.trim() && selectedCategory) {
        // Both search and category - use search API with category parameter as fallback
        url = `https://computer-b.vercel.app/api/products/search?q=${encodeURIComponent(searchTerm)}`
      } else if (searchTerm.trim()) {
        // Only search
        url = `https://computer-b.vercel.app/api/products/search?q=${encodeURIComponent(searchTerm)}`
      } else if (selectedCategory) {
        // Only category - use dedicated category API
        url = `https://computer-b.vercel.app/api/products/category/${selectedCategory}`
      } else {
        // No filters
        url = 'https://computer-b.vercel.app/api/products/all'
      }
      
      console.log('Fetching products with URL:', url)
      const response = await axios.get(url)
      console.log('API Response:', response.data)
      
      // Handle different response structures
      let productsArray = []
      if (Array.isArray(response.data)) {
        productsArray = response.data
      } else if (response.data && Array.isArray(response.data.products)) {
        productsArray = response.data.products
      } else if (response.data && Array.isArray(response.data.data)) {
        productsArray = response.data.data
      } else {
        console.log('Unexpected response structure:', response.data)
        productsArray = []
      }
      
      // If both search and category, apply client-side category filter
      if (searchTerm.trim() && selectedCategory && productsArray.length > 0) {
        productsArray = productsArray.filter(product => product.category?._id === selectedCategory)
        console.log('Applied client-side category filtering for combined search+category')
      }
      
      console.log('Final products array:', productsArray)
      setProducts(productsArray)
    } catch (error) {
      console.error('Error fetching products:', error)
      console.error('Error details:', error.response?.data)
      
      // Fallback to /all endpoint if API fails
      try {
        console.log('Trying fallback to /all endpoint')
        const fallbackResponse = await axios.get('https://computer-b.vercel.app/api/products/all')
        setProducts(fallbackResponse.data || [])
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        setProducts([])
      }
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/categories/all')
      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const addToOrder = (product, quantity = 1) => {
    const existingItem = selectedProducts.find(item => item._id === product._id)
    if (existingItem) {
      // For existing items, just increment by 1
      updateQuantity(product._id, existingItem.orderQuantity + 1)
    } else {
      // Check stock for new product
      if (product.quantity < quantity) {
        toast.error(`Only ${product.quantity} units available in stock`)
        return
      }
      setSelectedProducts([...selectedProducts, { ...product, orderQuantity: quantity }])
    }
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(item => item._id !== productId))
    } else {
      // Check stock availability
      const product = products.find(p => p._id === productId)
      const originalItem = originalProducts.find(p => p._id === productId)
      const originalQty = originalItem ? originalItem.orderQuantity : 0
      const availableStock = product.quantity + originalQty
      
      if (quantity > availableStock) {
        toast.error(`Only ${availableStock} units available in stock`)
        return
      }
      
      setSelectedProducts(selectedProducts.map(item =>
        item._id === productId ? { ...item, orderQuantity: quantity } : item
      ))
    }
  }

  const getTotalAmount = () => {
    return selectedProducts.reduce((total, item) => total + (item.sellingRate * item.orderQuantity), 0)
  }

  const handleUpdateOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || selectedProducts.length === 0) {
      toast.error('Please fill customer details and add products to order')
      return
    }
    
    if (customerInfo.phone && customerInfo.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerInfo.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    const orderData = {
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      address: customerInfo.address,
      items: selectedProducts.map(item => ({
        product: item._id,
        quantity: item.orderQuantity,
        price: item.sellingRate
      })),
      totalAmount: getTotalAmount(),
      type: orderType
    }

    try {
      await axios.put(`https://computer-b.vercel.app/api/orders/update/${id}`, orderData)
      
      // Backend handles all stock updates automatically
      
      toast.success(`${orderType} updated successfully!`)
      navigate(orderType === 'Quotation' ? '/quotation-list' : '/orders')
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order. Please try again.')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading order...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Edit {orderType}</h1>
          <p className="text-gray-600 text-sm sm:text-base">Update {orderType.toLowerCase()} details</p>
        </div>
        <button 
          onClick={() => navigate(orderType === 'Quotation' ? '/quotation-list' : '/orders')}
          className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm sm:text-base font-medium shadow-sm"
        >
          ← Back to {orderType === 'Quotation' ? 'Quotations' : 'Orders'}
        </button>
      </div>

      {/* Customer Info Section */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Customer Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Customer Name *"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
          <input
            type="tel"
            placeholder="Phone Number (10 digits)"
            value={customerInfo.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 10)
              setCustomerInfo({...customerInfo, phone: value})
            }}
            maxLength={10}
            pattern="[0-9]{10}"
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
          <input
            type="text"
            placeholder="Address (Optional)"
            value={customerInfo.address}
            onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
        </div>
      </div>

      {/* Products Section */}
      <div className="flex-1">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
            Available Products
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all duration-200"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all duration-200"
            >
              <option value="">🏷️ All Categories</option>
              {Array.isArray(categories) && categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showCompatible && compatibleProducts.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm p-4 sm:p-6 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Compatible Products
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {compatibleProducts.slice(0, 6).map(product => (
                <div key={product._id} className="bg-white p-3 rounded-lg border border-green-200 hover:shadow-md transition-all duration-200">
                  <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{product.category?.name} • ₹{product.sellingRate}</p>
                  <button
                    onClick={() => addToOrder(product)}
                    disabled={product.quantity === 0}
                    className="mt-2 w-full px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {product.quantity === 0 ? 'Out of Stock' : 'Add Compatible'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => {
                  const isSelected = selectedProducts.some(item => item._id === product._id)
                  return (
                  <motion.tr 
                    key={product._id} 
                    className={`${isSelected ? 'bg-green-50' : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => { setSelectedProduct(product); setShowModal(true) }}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        <div className="font-medium">{product.name}</div>
                        {product.attributes && Object.keys(product.attributes).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(product.attributes).slice(0, 2).map(([key, value]) => (
                              <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.category?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.brand || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">₹{product.sellingRate}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.quantity}</td>
                    <td className="px-4 py-3">
                      <motion.button
                        onClick={() => addToOrder(product)}
                        disabled={product.quantity === 0}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: product.quantity === 0 ? 1 : 1.05 }}
                        whileTap={{ scale: product.quantity === 0 ? 1 : 0.95 }}
                      >
                        Add
                      </motion.button>
                    </td>
                  </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {products.map((product, index) => {
              const isSelected = selectedProducts.some(item => item._id === product._id)
              return (
                <motion.div 
                  key={product._id} 
                  className={`p-3 border-b border-gray-200 ${isSelected ? 'bg-green-50' : ''}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <button 
                        onClick={() => { setSelectedProduct(product); setShowModal(true) }}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left w-full"
                      >
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{product.category?.name} • ₹{product.sellingRate}</p>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{product.quantity}</span>
                      <motion.button
                        onClick={() => addToOrder(product)}
                        disabled={product.quantity === 0}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: product.quantity === 0 ? 1 : 1.05 }}
                        whileTap={{ scale: product.quantity === 0 ? 1 : 0.95 }}
                      >
                        {product.quantity === 0 ? 'Out' : 'Add'}
                      </motion.button>
                    </div>
                  </div>
                  
                  {product.attributes && Object.keys(product.attributes).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(product.attributes).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {products.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-gray-400">📦</span>
              </div>
              <p className="text-gray-500 text-lg">No products available</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>



      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-transparent flex items-start justify-end z-50 p-4" style={{backdropFilter: 'blur(2px)'}}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full sm:w-96 h-[calc(100vh-8rem)] overflow-y-auto shadow-2xl mt-16 mr-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                {orderType} Summary
              </h3>
              <button 
                onClick={() => setShowCartModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl transition-colors duration-200"
              >
                ×
              </button>
            </div>
            
            {selectedProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-gray-400">🛒</span>
                </div>
                <p className="text-gray-500 text-lg">No items in cart</p>
                <p className="text-gray-400 text-sm mt-1">Add products to get started</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {selectedProducts.map(item => (
                    <div key={item._id} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-600">₹{item.sellingRate} each</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => updateQuantity(item._id, item.orderQuantity - 1)}
                          className="w-8 h-8 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center justify-center transition-colors duration-200"
                        >
                          −
                        </button>
                        <span className="text-sm font-bold w-8 text-center bg-white px-2 py-1 rounded border">{item.orderQuantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.orderQuantity + 1)}
                          className="w-8 h-8 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center justify-center transition-colors duration-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t-2 border-gray-200 pt-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                      <span className="text-2xl font-bold text-green-600">₹{getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={() => {
                      handleUpdateOrder()
                      setShowCartModal(false)
                    }}
                    disabled={selectedProducts.length === 0}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg transition-all duration-200"
                    whileHover={{ scale: selectedProducts.length === 0 ? 1 : 1.02 }}
                    whileTap={{ scale: selectedProducts.length === 0 ? 1 : 0.98 }}
                  >
                    🔄 Update {orderType}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      <button
        onClick={() => setShowCartModal(true)}
        className="fixed top-2 right-8 w-12 h-12 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full hover:from-green-700 hover:to-green-800 shadow-lg transition-all duration-200 flex items-center justify-center z-40"
      >
        <span className="text-2xl">🛒</span>
        {selectedProducts.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {selectedProducts.length}
          </span>
        )}
      </button>

      {/* Product Details Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 pr-4">{selectedProduct.name}</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl flex-shrink-0 transition-colors duration-200"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600"><strong>Category:</strong> {selectedProduct.category?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600"><strong>Brand:</strong> {selectedProduct.brand || 'N/A'}</p>
                <p className="text-sm text-gray-600"><strong>Model:</strong> {selectedProduct.modelNumber || 'N/A'}</p>
                <p className="text-sm text-gray-600"><strong>Price:</strong> <span className="text-green-600 font-medium text-lg">₹{selectedProduct.sellingRate}</span></p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-gray-600"><strong>Stock:</strong> {selectedProduct.quantity}</p>
                <p className="text-sm text-gray-600"><strong>Status:</strong> 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${
                    selectedProduct.status === 'Active' ? 'bg-green-100 text-green-800' :
                    selectedProduct.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedProduct.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600"><strong>Warranty:</strong> {selectedProduct.warranty || 'N/A'}</p>
              </div>
            </div>
            
            {selectedProduct.attributes && Object.keys(selectedProduct.attributes).length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Attributes:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(selectedProduct.attributes).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded-lg text-sm">
                      <strong>{key}:</strong> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => { addToOrder(selectedProduct); setShowModal(false) }}
                disabled={selectedProduct.quantity === 0}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg"
              >
                {selectedProduct.quantity === 0 ? '❌ Out of Stock' : '🛒 Add to Order'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-semibold transition-all duration-200 shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Update Order Button */}
      <button
        onClick={handleUpdateOrder}
        disabled={selectedProducts.length === 0}
        className="fixed bottom-6 right-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg transition-all duration-200 z-30"
      >
        🔄 Update {orderType}
      </button>
    </div>
  )
}

export default EditOrder