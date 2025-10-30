import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import axios from 'axios'

const Category = () => {
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [subcategoryForm, setSubcategoryForm] = useState({ name: '', description: '', category: '' })
  const [editId, setEditId] = useState(null)
  const [editSubcategoryId, setEditSubcategoryId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchSubcategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setError('')
      const response = await axios.get('https://computer-b.vercel.app/api/categories/all')
      const data = Array.isArray(response.data) ? response.data : 
                   (response.data?.categories || response.data?.data || [])
      setCategories(data)
    } catch (error) {
      setError('Failed to fetch categories')
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }

  const fetchSubcategories = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/subcategories')
      const data = Array.isArray(response.data) ? response.data : 
                   (response.data?.subcategories || response.data?.data || [])
      setSubcategories(data)
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      setSubcategories([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      if (editId) {
        await axios.put(`https://computer-b.vercel.app/api/categories/update/${editId}`, formData)
        toast.success('Category updated successfully!')
      } else {
        await axios.post('https://computer-b.vercel.app/api/categories/create', formData)
        toast.success('Category created successfully!')
      }
      fetchCategories()
      setFormData({ name: '', description: '' })
      setEditId(null)
    } catch (error) {
      setError('Failed to save category')
      console.error('Error saving category:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault()
    if (!subcategoryForm.name.trim() || !subcategoryForm.category) return
    
    setLoading(true)
    try {
      if (editSubcategoryId) {
        await axios.put(`https://computer-b.vercel.app/api/subcategories/${editSubcategoryId}`, subcategoryForm)
        toast.success('Subcategory updated successfully!')
      } else {
        await axios.post('https://computer-b.vercel.app/api/subcategories', subcategoryForm)
        toast.success('Subcategory created successfully!')
      }
      fetchSubcategories()
      setSubcategoryForm({ name: '', description: '', category: '' })
      setEditSubcategoryId(null)
    } catch (error) {
      toast.error('Failed to save subcategory')
      console.error('Error saving subcategory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setFormData({ name: category.name, description: category.description })
    setEditId(category._id)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditSubcategory = (subcategory) => {
    setSubcategoryForm({ 
      name: subcategory.name, 
      description: subcategory.description || '', 
      category: subcategory.category?._id || subcategory.category 
    })
    setEditSubcategoryId(subcategory._id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return
    
    try {
      setError('')
      await axios.delete(`https://computer-b.vercel.app/api/categories/delete/${id}`)
      toast.success('Category deleted successfully!')
      fetchCategories()
    } catch (error) {
      setError('Failed to delete category')
      console.error('Error deleting category:', error)
    }
  }

  const handleDeleteSubcategory = async (id) => {
    if (!confirm('Delete this subcategory?')) return
    
    try {
      await axios.delete(`https://computer-b.vercel.app/api/subcategories/${id}`)
      toast.success('Subcategory deleted successfully!')
      fetchSubcategories()
    } catch (error) {
      toast.error('Failed to delete subcategory')
      console.error('Error deleting subcategory:', error)
    }
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto px-4 sm:px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-4 sm:p-8 border border-gray-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Categories & Subcategories</h1>
          <p className="text-gray-600 text-base sm:text-lg">Manage your product categories and subcategories</p>
        </div>
      </div>
      
      {error && (
        <motion.div 
          className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          {error}
        </motion.div>
      )}
      
      {/* Category Form */}
      <motion.div 
        className="mb-8 p-4 sm:p-8 bg-white border border-gray-200 rounded-2xl shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-6">
          {editId ? 'Edit Category' : 'Add New Category'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50 transition-all"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 h-24 resize-none disabled:bg-gray-50 transition-all"
              placeholder="Enter description (optional)"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl font-medium disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {loading ? 'Saving...' : editId ? 'Update' : 'Create'} Category
            </button>
            
            {editId && (
              <button 
                type="button" 
                onClick={() => { setEditId(null); setFormData({ name: '', description: '' }); setError('') }}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 hover:bg-gray-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* Subcategory Form */}
      <motion.div 
        className="mb-8 p-4 sm:p-8 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-6">
          {editSubcategoryId ? 'Edit Subcategory' : 'Add Subcategory'}
        </h3>
        
        <form onSubmit={handleSubcategorySubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory Name</label>
            <input
              type="text"
              value={subcategoryForm.name}
              onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="Enter subcategory name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
            <select
              value={subcategoryForm.category}
              onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={subcategoryForm.description}
              onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="Enter description"
            />
          </div>
          <div className="md:col-span-3 flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : editSubcategoryId ? 'Update' : 'Create'} Subcategory
            </button>
            {editSubcategoryId && (
              <button 
                type="button" 
                onClick={() => { 
                  setEditSubcategoryId(null); 
                  setSubcategoryForm({ name: '', description: '', category: '' }); 
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* Categories List */}
      <motion.div 
        className="mb-8 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Categories</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
          {categories.map((category, index) => (
            <motion.div
              key={category._id}
              className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">{category.name}</h4>
                <p className="text-sm text-gray-600 mb-2">
                  {category.description || 'No description available'}
                </p>
                {subcategories.filter(sub => sub.category?._id === category._id).length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Subcategories:</p>
                    <div className="flex flex-wrap gap-1">
                      {subcategories.filter(sub => sub.category?._id === category._id).map((sub) => (
                        <span key={sub._id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => handleEdit(category)} 
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(category._id)} 
                  className="flex-1 px-4 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-100"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        
        {categories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-gray-500 text-lg mb-2">No categories found</p>
            <p className="text-gray-400 text-sm">Create your first category using the form above</p>
          </div>
        )}
      </motion.div>

      {/* Subcategories List */}
      <motion.div 
        className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">All Subcategories</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {subcategories.map((subcategory, index) => (
            <motion.div
              key={subcategory._id}
              className="p-4 bg-blue-50 rounded-xl border border-blue-100 hover:shadow-md transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <div className="mb-3">
                <h5 className="font-semibold text-gray-800 mb-1">{subcategory.name}</h5>
                <p className="text-xs text-blue-600 mb-2">
                  Category: {subcategory.category?.name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">
                  {subcategory.description || 'No description'}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEditSubcategory(subcategory)} 
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteSubcategory(subcategory._id)} 
                  className="flex-1 px-3 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-100"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        
        {subcategories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-gray-500 mb-2">No subcategories found</p>
            <p className="text-gray-400 text-sm">Create your first subcategory using the form above</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default Category