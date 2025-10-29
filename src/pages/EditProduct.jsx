import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'

const EditProduct = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [categories, setCategories] = useState([])
  const [categoryAttributes, setCategoryAttributes] = useState([])
  const [backendAttributes, setBackendAttributes] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    modelNumber: '',
    quantity: 0,
    sellingRate: 0,
    costRate: 0,
    status: 'Active',
    warranty: '',
    attributes: {}
  })
  const [newAttribute, setNewAttribute] = useState({ key: '', value: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchProduct()
  }, [id])

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

  const fetchCategoryAttributes = async (categoryId, existingAttributes = {}) => {
    try {
      const response = await axios.get(`https://computer-b.vercel.app/api/attributes/category/${categoryId}/attributes`)
      
      if (response.data && response.data.attributes) {
        const fetchedAttrs = Object.keys(response.data.attributes)
        setBackendAttributes(fetchedAttrs)
        
        // Merge backend attributes with existing attributes, keeping existing values
        const mergedAttributes = { ...response.data.attributes }
        Object.keys(existingAttributes).forEach(key => {
          mergedAttributes[key] = existingAttributes[key]
        })
        
        setFormData(prev => ({
          ...prev,
          attributes: mergedAttributes
        }))
      }
      setCategoryAttributes([])
    } catch (error) {
      console.error('Error fetching category attributes:', error)
      setCategoryAttributes([])
    }
  }

  const handleCategoryChange = (categoryId) => {
    setFormData({ ...formData, category: categoryId })
    setBackendAttributes([])
    if (categoryId) {
      fetchCategoryAttributes(categoryId, formData.attributes)
    } else {
      setCategoryAttributes([])
    }
    setNewAttribute({ key: '', value: '' })
  }

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`https://computer-b.vercel.app/api/products/get/${id}`)
      const product = response.data.data || response.data
      
      if (!product) {
        toast.error('Product not found')
        navigate('/products')
        return
      }
      
      const categoryId = product.category?._id || ''
      setFormData({
        name: product.name,
        category: categoryId,
        brand: product.brand || '',
        modelNumber: product.modelNumber || '',
        quantity: product.quantity,
        sellingRate: product.sellingRate,
        costRate: product.costRate || 0,
        status: product.status,
        warranty: product.warranty || '',
        attributes: product.attributes || {}
      })
      
      // Fetch category attributes if category exists
      if (categoryId) {
        fetchCategoryAttributes(categoryId, product.attributes || {})
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('Failed to load product')
      navigate('/products')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.put(`https://computer-b.vercel.app/api/products/update/${id}`, formData)
      toast.success('Product updated successfully!')
      navigate('/products')
    } catch (error) {
      console.error('Error updating product:', error)
      toast.error('Failed to update product')
    }
  }

  const addAttribute = () => {
    if (newAttribute.key && newAttribute.value) {
      setFormData({
        ...formData,
        attributes: {
          ...formData.attributes,
          [newAttribute.key]: newAttribute.value
        }
      })
      setNewAttribute({ key: '', value: '' })
    }
  }

  const removeAttribute = (key) => {
    const updatedAttributes = { ...formData.attributes }
    delete updatedAttributes[key]
    setFormData({ ...formData, attributes: updatedAttributes })
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Edit Product</h1>
          <p className="text-gray-600 text-sm mt-1">Update product information</p>
        </div>
        <button 
          onClick={() => navigate('/products')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 whitespace-nowrap"
        >
          Back to Products
        </button>
      </div>
      
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
            <input
              type="text"
              value={formData.modelNumber}
              onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter model number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Rate</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellingRate}
              onChange={(e) => setFormData({ ...formData, sellingRate: parseFloat(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Rate</label>
            <input
              type="number"
              step="0.01"
              value={formData.costRate}
              onChange={(e) => setFormData({ ...formData, costRate: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty</label>
            <input
              type="text"
              value={formData.warranty}
              onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter warranty period"
            />
          </div>

          <div className="md:col-span-2">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Attributes</h4>
            
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                placeholder="Attribute name (e.g., Socket)"
                value={newAttribute.key}
                onChange={(e) => setNewAttribute({ ...newAttribute, key: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Value (e.g., AM4)"
                value={newAttribute.value}
                onChange={(e) => setNewAttribute({ ...newAttribute, value: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addAttribute}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
              >
                Add
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(formData.attributes).map(([key, value]) => {
                const isBackendAttribute = backendAttributes.includes(key)
                return (
                  <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setFormData({
                          ...formData,
                          attributes: {
                            ...formData.attributes,
                            [key]: e.target.value
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        placeholder={`Enter ${key.toLowerCase()}`}
                      />
                    </div>
                    {!isBackendAttribute && (
                      <button
                        type="button"
                        onClick={() => removeAttribute(key)}
                        className="text-red-600 hover:text-red-800 text-xs whitespace-nowrap mt-4"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              type="submit" 
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Update Product
            </button>
            <button 
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProduct