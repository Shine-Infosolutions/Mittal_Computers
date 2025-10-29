import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import axios from 'axios'
import { formatIndianCurrency } from './utils/formatters'

const Product = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [editId, setEditId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)

  useEffect(() => {
    fetchProducts(1)
    fetchCategories()
  }, [])



  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true)
      
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
        // No filters - add pagination
        url = `https://computer-b.vercel.app/api/products/all?page=${page}&limit=20`
      }
      
      console.log('Fetching products with URL:', url)
      const response = await axios.get(url)
      console.log('API Response:', response.data)
      
      // Handle different response structures
      let productsArray = []
      let paginationMeta = null
      
      if (Array.isArray(response.data)) {
        productsArray = response.data
      } else if (response.data && Array.isArray(response.data.products)) {
        productsArray = response.data.products
        paginationMeta = response.data.meta
      } else if (response.data && Array.isArray(response.data.data)) {
        productsArray = response.data.data
        paginationMeta = response.data.meta
      } else {
        console.log('Unexpected response structure:', response.data)
        productsArray = []
      }
      
      // Update pagination info
      if (paginationMeta) {
        setTotalPages(paginationMeta.totalPages || 1)
      } else {
        setTotalPages(1)
      }
      
      // If both search and category, apply client-side category filter
      if (searchTerm.trim() && selectedCategory && productsArray.length > 0) {
        productsArray = productsArray.filter(product => product.category?._id === selectedCategory)
        console.log('Applied client-side category filtering for combined search+category')
      }
      
      console.log('Final products array:', productsArray)
      // Sort products by creation date (newest first)
      const sortedProducts = productsArray.sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id))
      setProducts(sortedProducts)
      setCurrentPage(page)
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
    } finally {
      setLoading(false)
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

  const handleEdit = (product) => {
    // Navigate to edit page with product ID
    navigate(`/edit-product/${product._id}`)
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`https://computer-b.vercel.app/api/products/delete/${productToDelete}`)
      fetchProducts()
      toast.success('✅ Product deleted successfully!')
      setShowDeleteModal(false)
      setProductToDelete(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('❌ Failed to delete product. Please try again.')
      setShowDeleteModal(false)
      setProductToDelete(null)
    }
  }

  const exportToCSV = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/products/export/csv')
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Products exported to CSV successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export products. Please try again.')
    }
  }





  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchProducts(1)
    }, 500)
    return () => clearTimeout(delayedSearch)
  }, [searchTerm, selectedCategory])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-4 sm:p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">Products</h1>
              <p className="text-gray-600 text-base sm:text-lg">Manage your computer parts inventory</p>
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
                onClick={() => navigate('/bulk-import')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                📥 Bulk Import
              </motion.button>
              <motion.button 
                onClick={() => navigate('/add-product')}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-medium shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                + Add Product
              </motion.button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 shadow-sm w-full sm:w-64"
            />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 shadow-sm w-full sm:w-auto"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 w-full lg:w-auto text-left lg:text-right">
            {products.length} products found
          </div>
        </div>
      </div>
      


      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {Array.isArray(products) && products.map((product, index) => (
          <motion.div
            key={product._id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.modelNumber || 'No model'}</p>
                {product.attributes && Object.keys(product.attributes).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(product.attributes).slice(0, 2).map(([key, value]) => (
                      <span key={key} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                        {key}: {value}
                      </span>
                    ))}
                    {Object.keys(product.attributes).length > 2 && (
                      <span className="text-xs text-gray-400">+{Object.keys(product.attributes).length - 2} more</span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-lg font-bold text-gray-900">{formatIndianCurrency(product.sellingRate)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>
                <p className="font-medium">{product.category?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Brand:</span>
                <p className="font-medium">{product.brand || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Stock:</span>
                <p className={`font-medium ${
                  product.quantity > 10 ? 'text-emerald-600' :
                  product.quantity > 0 ? 'text-amber-600' : 'text-rose-600'
                }`}>{product.quantity}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  product.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                  product.status === 'Inactive' ? 'bg-gray-50 text-gray-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  {product.status}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleEdit(product)} 
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                Edit
              </button>
              <button 
                onClick={() => { setProductToDelete(product._id); setShowDeleteModal(true); }}
                className="flex-1 px-3 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-100"
              >
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop Table View */}
      <motion.div 
        className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {Array.isArray(products) && products.map((product, index) => (
                <motion.tr 
                  key={product._id}
                  className="hover:bg-gray-50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.modelNumber || 'No model'}</div>
                      {product.attributes && Object.keys(product.attributes).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(product.attributes).slice(0, 2).map(([key, value]) => (
                            <span key={key} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                              {key}: {value}
                            </span>
                          ))}
                          {Object.keys(product.attributes).length > 2 && (
                            <span className="text-xs text-gray-400">+{Object.keys(product.attributes).length - 2} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      {product.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.brand || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-800">{formatIndianCurrency(product.sellingRate)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      product.quantity > 10 ? 'text-emerald-600' :
                      product.quantity > 0 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {product.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      product.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                      product.status === 'Inactive' ? 'bg-gray-50 text-gray-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(product)} 
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => { setProductToDelete(product._id); setShowDeleteModal(true); }}
                        className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg mb-2">
              {selectedCategory ? 'No products in this category' : 'No products found'}
            </p>
            <p className="text-gray-400 text-sm">Create your first product using the button above</p>
          </div>
        )}
      </motion.div>
      
      {/* Pagination */}
      <div className="flex flex-wrap justify-center items-center mt-6 gap-2">
          <button
            onClick={() => fetchProducts(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => fetchProducts(page)}
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
            onClick={() => fetchProducts(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Product</h3>
              <p className="text-gray-600">Are you sure you want to delete this product? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

export default Product