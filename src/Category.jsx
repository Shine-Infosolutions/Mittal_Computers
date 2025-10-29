import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import axios from 'axios'

const Category = () => {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Configure axios with CSRF token
  useEffect(() => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (token) {
      axios.defaults.headers.common['X-CSRF-TOKEN'] = token
    }
  }, [])

  useEffect(() => {
    fetchCategories()
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

  const handleEdit = (category) => {
    setFormData({ name: category.name, description: category.description })
    setEditId(category._id)
    setError('')
    // Scroll to top to show the form
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

  return (
    <motion.div 
      className="max-w-6xl mx-auto px-4 sm:px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-4 sm:p-8 border border-gray-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Categories</h1>
          <p className="text-gray-600 text-base sm:text-lg">Manage your product categories</p>
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
      
      <motion.div 
        className="mb-8 p-4 sm:p-8 bg-white border border-gray-200 rounded-2xl shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ 
          scale: 1.005,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-6">
          {editId ? 'Edit Category' : 'Add New Category'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <motion.input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50 transition-all"
              placeholder="Enter category name"
              whileFocus={{ scale: 1.01 }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <motion.textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 h-24 resize-none disabled:bg-gray-50 transition-all"
              placeholder="Enter description (optional)"
              whileFocus={{ scale: 1.01 }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl font-medium disabled:opacity-50 shadow-sm hover:shadow-md"
              whileHover={{ 
                scale: loading ? 1 : 1.02,
                y: loading ? 0 : -1
              }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? 'Saving...' : editId ? 'Update' : 'Create'} Category
            </motion.button>
            
            {editId && (
              <motion.button 
                type="button" 
                onClick={() => { setEditId(null); setFormData({ name: '', description: '' }); setError('') }}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 hover:bg-gray-200"
                whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -1 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                Cancel
              </motion.button>
            )}
          </div>
        </form>
      </motion.div>

      <motion.div 
        className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
          {categories.map((category, index) => (
            <motion.div
              key={category._id}
              className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ 
                scale: 1.02,
                y: -2
              }}
            >
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">{category.name}</h4>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {category.description || 'No description available'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button 
                  onClick={() => handleEdit(category)} 
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Edit
                </motion.button>
                <motion.button 
                  onClick={() => handleDelete(category._id)} 
                  className="flex-1 px-4 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-100"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
        
        {categories.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-6xl mb-4">📁</div>
            <p className="text-gray-500 text-lg mb-2">No categories found</p>
            <p className="text-gray-400 text-sm">Create your first category using the form above</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default Category