import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import axios from 'axios'
import { formatIndianCurrency } from '../utils/formatters'

const CreateOrder = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [itemSelections, setItemSelections] = useState({})

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/products/all')
      const productsArray = Array.isArray(response.data) ? response.data : 
                           (response.data?.products || response.data?.data || [])
      setProducts(productsArray)
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/categories/all')
      const data = Array.isArray(response.data) ? response.data : 
                   (response.data?.categories || response.data?.data || [])
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }

  const [compatibleProducts, setCompatibleProducts] = useState([])
  const [compatibilityLoading, setCompatibilityLoading] = useState(false)

  useEffect(() => {
    if (selectedProducts.length > 0) {
      fetchCompatibleProducts()
    } else {
      setCompatibleProducts([])
    }
  }, [selectedProducts.length])

  const fetchCompatibleProducts = async () => {
    try {
      setCompatibilityLoading(true)
      const selectedProductIds = selectedProducts.map(item => item._id)
      const response = await axios.post('https://computer-b.vercel.app/api/products/compatibility/sequential', {
        selectedProducts: selectedProductIds
      })
      
      let compatibleData = response.data.compatibleProducts || []
      
      // Merge with complete product data
      compatibleData = compatibleData.map(compatibleProduct => {
        const fullProduct = products.find(p => p._id === compatibleProduct._id)
        if (fullProduct) {
          return {
            ...compatibleProduct,
            sellingRate: fullProduct.sellingRate,
            quantity: fullProduct.quantity,
            brand: fullProduct.brand,
            category: fullProduct.category,
            attributes: fullProduct.attributes
          }
        }
        return compatibleProduct
      })
      
      setCompatibleProducts(compatibleData)
    } catch (error) {
      console.error('Error fetching compatible products:', error)
      setCompatibleProducts([])
    } finally {
      setCompatibilityLoading(false)
    }
  }

  const isProductCompatible = (productId) => {
    if (selectedProducts.length === 0) return true
    const compatibleIds = compatibleProducts.map(p => p._id)
    return compatibleIds.includes(productId)
  }

  const getAllCategoryProducts = (categoryId) => {
    return products.filter(product => product.category?._id === categoryId)
  }

  const handleItemSelection = (itemType, productId) => {
    setItemSelections(prev => ({ ...prev, [itemType]: productId }))
    
    if (productId) {
      const product = products.find(p => p._id === productId)
      if (product) {
        const existingIndex = selectedProducts.findIndex(p => p.itemType === itemType)
        if (existingIndex >= 0) {
          const updated = [...selectedProducts]
          updated[existingIndex] = { ...product, itemType, orderQuantity: 1 }
          setSelectedProducts(updated)
        } else {
          setSelectedProducts(prev => [...prev, { ...product, itemType, orderQuantity: 1 }])
        }
      }
    } else {
      setSelectedProducts(prev => prev.filter(p => p.itemType !== itemType))
    }
  }

  const updateQuantity = (itemType, quantity) => {
    setSelectedProducts(prev => 
      prev.map(item => 
        item.itemType === itemType 
          ? { ...item, orderQuantity: Math.max(1, quantity) }
          : item
      )
    )
  }

  const removeItem = (itemType) => {
    setSelectedProducts(prev => prev.filter(p => p.itemType !== itemType))
    setItemSelections(prev => ({ ...prev, [itemType]: '' }))
  }

  const getTotalAmount = () => {
    return selectedProducts.reduce((total, item) => total + (item.sellingRate * item.orderQuantity), 0)
  }

  const handleSubmitOrder = async () => {
    if (!customerInfo.name?.trim()) {
      toast.error('Customer name is required')
      return
    }

    if (!customerInfo.email?.trim()) {
      toast.error('Customer email is required')
      return
    }

    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product to the order')
      return
    }

    const orderData = {
      customerName: customerInfo.name.trim(),
      customerEmail: customerInfo.email.trim(),
      customerPhone: customerInfo.phone || '',
      address: customerInfo.address?.trim() || '',
      items: selectedProducts.map(item => ({
        product: item._id,
        quantity: parseInt(item.orderQuantity),
        price: parseFloat(item.sellingRate)
      })),
      totalAmount: parseFloat(getTotalAmount().toFixed(2))
    }

    try {
      await axios.post('https://computer-b.vercel.app/api/orders/create', orderData)
      toast.success('Order created successfully!')
      setSelectedProducts([])
      setItemSelections({})
      setCustomerInfo({ name: '', email: '', phone: '', address: '' })
      navigate('/orders')
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Create Order</h1>
          <p className="text-gray-600 text-sm sm:text-base">Configure computer parts for customer</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm sm:text-base font-medium shadow-sm"
        >
          ← Back to Orders
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
            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
          <input
            type="tel"
            placeholder="Phone Number (10 digits)"
            value={customerInfo.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 10)
              setCustomerInfo({ ...customerInfo, phone: value })
            }}
            maxLength={10}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
          <input
            type="text"
            placeholder="Address (Optional)"
            value={customerInfo.address}
            onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-sm transition-all duration-200"
          />
        </div>
      </div>

      {/* Product Configuration Section */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center mb-4">
          <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
          Product Configuration
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-yellow-400">
                <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-900">Item Type</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-900">Description</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-900">Price</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-900">Qty</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => {
                const selectedProduct = selectedProducts.find(p => p.itemType === category._id)
                
                return (
                  <tr key={category._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">
                      {category.name}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <select
                        value={itemSelections[category._id] || ''}
                        onChange={(e) => handleItemSelection(category._id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                      >
                        <option value="">Select {category.name}</option>
                        {getAllCategoryProducts(category._id).map(product => {
                          const isCompatible = isProductCompatible(product._id)
                          return (
                            <option 
                              key={product._id} 
                              value={product._id}
                              style={{ 
                                color: isCompatible ? '#059669' : '#6B7280',
                                fontWeight: isCompatible ? 'bold' : 'normal'
                              }}
                            >
                              {isCompatible ? '✓ ' : ''}{product.name}
                            </option>
                          )
                        })}
                      </select>
                      {compatibleProducts.length > 0 && (
                        <div className="mt-1 text-xs text-green-600">
                          ✓ {compatibleProducts.filter(p => p.category?._id === category._id).length} compatible
                        </div>
                      )}
                      {compatibilityLoading && (
                        <div className="mt-1 text-xs text-blue-600">
                          🔄 Checking...
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 font-medium text-green-600">
                      {selectedProduct ? formatIndianCurrency(selectedProduct.sellingRate) : '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      {selectedProduct ? (
                        <input
                          type="number"
                          min="1"
                          value={selectedProduct.orderQuantity}
                          onChange={(e) => updateQuantity(category._id, parseInt(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                      ) : '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      {selectedProduct && (
                        <button
                          onClick={() => removeItem(category._id)}
                          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Total Amount */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border-t-2 border-green-500">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600">{formatIndianCurrency(getTotalAmount())}</span>
            </div>
          </div>
        )}
      </div>

      {/* Order Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSubmitOrder}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              🛍️ Create Order
            </button>
            <button
              onClick={async () => {
                if (!customerInfo.name?.trim() || !customerInfo.email?.trim()) {
                  toast.error('Customer name and email are required')
                  return
                }
                const quotationData = {
                  customerName: customerInfo.name.trim(),
                  customerEmail: customerInfo.email.trim(),
                  customerPhone: customerInfo.phone || '',
                  address: customerInfo.address?.trim() || '',
                  type: 'Quotation',
                  items: selectedProducts.map(item => ({
                    product: item._id,
                    quantity: parseInt(item.orderQuantity),
                    price: parseFloat(item.sellingRate)
                  })),
                  totalAmount: parseFloat(getTotalAmount().toFixed(2))
                }
                try {
                  await axios.post('https://computer-b.vercel.app/api/orders/create', quotationData)
                  toast.success('Quotation generated successfully!')
                  setSelectedProducts([])
                  setItemSelections({})
                  navigate('/quotation-list')
                } catch (error) {
                  toast.error('Failed to generate quotation')
                }
              }}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              📄 Generate Quote
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateOrder