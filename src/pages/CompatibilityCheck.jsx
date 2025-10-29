import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import axios from 'axios'
import { formatIndianCurrency } from '../utils/formatters'

const CompatibilityCheck = ({ selectedProducts, onAddProduct, categories, products }) => {
  const [compatibleProducts, setCompatibleProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingProduct, setPendingProduct] = useState(null)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (selectedProducts.length > 0 && !hasChecked) {
      fetchCompatibleProducts()
    } else if (selectedProducts.length === 0) {
      setCompatibleProducts([])
      setHasChecked(false)
    }
  }, [selectedProducts.length, hasChecked])

  const fetchCompatibleProducts = async () => {
    try {
      setLoading(true)
      console.log('Fetching sequential compatible products for selected items:', selectedProducts.map(p => p._id))
      
      const selectedProductIds = selectedProducts.map(item => item._id)
      const response = await axios.post('https://computer-b.vercel.app/api/products/compatibility/sequential', {
        selectedProducts: selectedProductIds
      })
      
      console.log('Sequential compatibility API response:', response.data)
      
      let compatibleData = response.data.compatibleProducts || []
      console.log('Raw compatible products from backend:', compatibleData.length)
      
      // Merge with complete product data from products API
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
      
      console.log('Compatible products after merging with full data:', compatibleData.length)
      
      // Don't filter out products from categories already selected
      console.log('Keeping all compatible products regardless of selected categories')
      
      console.log('Compatible products after filtering:', compatibleData.length)
      setCompatibleProducts(compatibleData)
      setHasChecked(true)
      
      if (compatibleData.length === 0) {
        toast.info('No compatible products found')
      }
    } catch (error) {
      console.error('Error fetching compatible products:', error)
      setCompatibleProducts([])
      toast.error('Failed to fetch compatible products')
    } finally {
      setLoading(false)
    }
  }

  if (selectedProducts.length === 0) {
    return null
  }

  return (
    <div className="compatible-products-section bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-lg mb-6">
      <h3 className="text-xl font-bold text-blue-900 p-6 border-b border-blue-200 flex items-center">
        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
        🔗 Compatible Products
      </h3>
      
      {loading ? (
        <div className="p-6 text-center">
          <div className="text-blue-600">Loading compatible products...</div>
        </div>
      ) : (
        <div className="p-4">
          {compatibleProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No compatible products found</div>
            </div>
          ) : (
            Object.entries(
              compatibleProducts.reduce((acc, product) => {
                const categoryName = product.category?.name || 
                  categories?.find(cat => cat._id === product.category?._id)?.name || 
                  'Uncategorized'
                if (!acc[categoryName]) acc[categoryName] = []
                acc[categoryName].push(product)
                return acc
              }, {})
            ).map(([categoryName, products]) => (
              <div key={categoryName} className="mb-6">
                <h4 className="font-semibold text-gray-700 text-sm mb-3 border-b pb-2">{categoryName}</h4>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-blue-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all duration-200">
                      <div className="flex-1 mb-3 sm:mb-0">
                        <p className="font-semibold text-sm text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {product.brand || 'N/A'} • {formatIndianCurrency(product.sellingRate || 0)} • Stock: {product.quantity || 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const existingItem = selectedProducts.find(item => item._id === product._id)
                            if (existingItem && existingItem.orderQuantity > 1) {
                              onAddProduct(product, -1)
                            }
                          }}
                          disabled={!selectedProducts.find(item => item._id === product._id) || selectedProducts.find(item => item._id === product._id)?.orderQuantity <= 1}
                          className="w-8 h-8 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-medium w-8 text-center">
                          {selectedProducts.find(item => item._id === product._id)?.orderQuantity || 0}
                        </span>
                        <button
                          onClick={() => {
                            const existingItem = selectedProducts.find(item => item._id === product._id)
                            if (existingItem && existingItem.orderQuantity >= 1) {
                              setPendingProduct(product)
                              setShowConfirmModal(true)
                            } else {
                              onAddProduct(product, 1, true)
                            }
                          }}
                          disabled={!product.quantity || product.quantity === 0}
                          className="w-8 h-8 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmModal && pendingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Another Item?</h3>
            <p className="text-gray-600 mb-6">
              Do you want to add this item again?<br/>
              Current quantity: {selectedProducts.find(item => item._id === pendingProduct._id)?.orderQuantity || 0}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setPendingProduct(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAddProduct(pendingProduct, 1, true)
                  setShowConfirmModal(false)
                  setPendingProduct(null)
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompatibilityCheck