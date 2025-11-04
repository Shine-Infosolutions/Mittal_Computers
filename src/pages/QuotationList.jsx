import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import axios from 'axios'
import { formatIndianCurrency, formatIndianNumber } from '../utils/formatters'


const QuotationList = () => {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [quotationToDelete, setQuotationToDelete] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredQuotations, setFilteredQuotations] = useState([])


  useEffect(() => {
    fetchQuotations()
  }, [])

  const fetchQuotations = async (search = '') => {
    try {
      const url = search 
        ? `https://computer-b.vercel.app/api/orders/get?search=${encodeURIComponent(search)}&type=Quotation`
        : 'https://computer-b.vercel.app/api/orders/get?type=Quotation'
      
      console.log('API URL:', url)
      const response = await axios.get(url)
      console.log('API Response:', response.data)
      
      const quotationData = response.data.data || []
      
      // Sort quotations by creation date (newest first)
      const sortedQuotations = quotationData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setQuotations(sortedQuotations)
    } catch (error) {
      console.error('Error fetching quotations:', error)
      console.error('Error details:', error.response?.data)
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (value.trim()) {
      const filtered = quotations.filter(quotation => 
        quotation.customerName?.toLowerCase().includes(value.toLowerCase()) ||
        quotation.customerEmail?.toLowerCase().includes(value.toLowerCase()) ||
        quotation.quoteId?.toLowerCase().includes(value.toLowerCase()) ||
        quotation._id?.slice(-6).toLowerCase().includes(value.toLowerCase())
      )
      setFilteredQuotations(filtered)
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
      setFilteredQuotations([])
    }
  }

  const handleDeleteQuotation = async () => {
    try {
      await axios.delete(`https://computer-b.vercel.app/api/orders/quotations/${quotationToDelete}`)
      toast.success('Quotation deleted successfully!')
      fetchQuotations(searchTerm)
      setShowDeleteModal(false)
      setQuotationToDelete(null)
    } catch (error) {
      console.error('Error deleting quotation:', error)
      toast.error('Failed to delete quotation. Please try again.')
      setShowDeleteModal(false)
      setQuotationToDelete(null)
    }
  }



  const handleStatusChange = async (quotationId, newStatus) => {
    try {
      await axios.put(`https://computer-b.vercel.app/api/orders/quotations/${quotationId}/status`, {
        status: newStatus
      })
      
      // Refetch data to get updated status
      await fetchQuotations(searchTerm)
      
      toast.success(`Quotation ${newStatus}!`)
    } catch (error) {
      console.error('Error updating status:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      toast.error('Failed to update status')
    }
  }

  const shareOnWhatsApp = (orderData) => {
    try {
      let message = `🏪 *Computer Shop Quotation*\n\n`
      message += `👤 *Customer:* ${orderData.customer.name}\n`
      message += `📧 *Email:* ${orderData.customer.email}\n`
      message += `📱 *Phone:* ${orderData.customer.phone}\n\n`
      message += `📋 *Items:*\n`
      
      orderData.products.forEach((item, index) => {
        message += `${index + 1}. ${item.name}\n`
        message += `   Qty: ${item.orderQuantity} | Rate: ${formatIndianCurrency(item.sellingRate)}\n`
      })
      
      message += `\n💰 *Total Amount: ${formatIndianCurrency(orderData.totalAmount)}*\n\n`
      message += `📅 Date: ${new Date().toLocaleDateString()}\n`
      message += `🙏 Thank you for your business!`
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
      
      toast.success('WhatsApp opened with quotation details!')
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error)
      toast.error('Failed to share on WhatsApp. Please try again.')
    }
  }

  const exportToCSV = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/orders/quotations/export/csv')
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quotations-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Quotations exported to CSV successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export quotations. Please try again.')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading quotations...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-hidden">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-4 sm:p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">Quotation List</h1>
              <p className="text-gray-600 text-base sm:text-lg">View and manage customer quotations</p>
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
                + Create New Quotation
              </motion.button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="relative w-full lg:w-96">
            <input
              type="text"
              placeholder="Search quotations by customer name, email, or quote ID..."
              value={searchTerm}
              onChange={handleSearch}
              onFocus={() => searchTerm && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 shadow-sm w-full"
            />
            {showDropdown && filteredQuotations.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
                {filteredQuotations.slice(0, 5).map((quotation) => (
                  <div
                    key={quotation._id}
                    onClick={() => {
                      setSearchTerm('')
                      setShowDropdown(false)
                      navigate(`/view-pdf/${quotation._id}`)
                    }}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{quotation.quoteId || `#QT-${quotation._id?.slice(-6)}`}</p>
                        <p className="text-sm text-gray-600">{quotation.customerName}</p>
                        <p className="text-xs text-gray-500">{quotation.customerEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatIndianCurrency(quotation.totalAmount || 0)}</p>
                        <p className="text-xs text-gray-500">{new Date(quotation.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredQuotations.length > 5 && (
                  <div className="p-2 text-center text-sm text-gray-500 bg-gray-50">
                    +{filteredQuotations.length - 5} more results
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 w-full lg:w-auto text-left lg:text-right">
            {quotations.length} quotations found
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {quotations.map((quotation, index) => (
          <div
            key={quotation._id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{quotation.quoteId || `#QT-${quotation._id?.slice(-6)}` || 'N/A'}</h3>
                <p className="text-sm text-gray-600">{quotation.customerName}</p>
                <p className="text-xs text-gray-500">{quotation.customerEmail}</p>
              </div>
              <span className="text-lg font-bold text-gray-900">{formatIndianCurrency(quotation.totalAmount || 0)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <span className="text-gray-500">Items:</span>
                <p className="font-medium">{quotation.items?.length || 0} items</p>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{new Date(quotation.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Status:</span>
                <select
                  value={quotation.status || 'Pending'}
                  onChange={(e) => handleStatusChange(quotation._id, e.target.value)}
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 ${
                    quotation.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-amber-50 text-amber-600'
                  }`}
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => navigate(`/view-pdf/${quotation._id}`)}
                className="px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200"
              >
                View PDF
              </button>
              <button 
                onClick={() => {
                  const shareableUrl = `${window.location.origin}/shared-quotation/${quotation._id}`
                  let message = `🏪 *Computer Shop Quotation*\n\n`
                  message += `👤 *Customer:* ${quotation.customerName}\n`
                  message += `📧 *Email:* ${quotation.customerEmail}\n`
                  message += `📱 *Phone:* ${quotation.customerPhone}\n\n`
                  message += `📋 *Items:*\n`
                  
                  if (quotation.items && quotation.items.length > 0) {
                    quotation.items.forEach((item, index) => {
                      message += `${index + 1}. ${item.name || item.product?.name || 'Product'}\n`
                      message += `   Qty: ${item.quantity} | Rate: ₹${formatIndianNumber(item.price)}\n`
                    })
                  }
                  
                  message += `\n💰 *Total Amount: ₹${formatIndianNumber(quotation.totalAmount?.toFixed(2))}*\n\n`
                  message += `📅 Date: ${new Date(quotation.createdAt).toLocaleDateString()}\n`
                  message += `🔗 View PDF: ${shareableUrl}\n`
                  message += `🙏 Thank you for your business!`
                  
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                  window.open(whatsappUrl, '_blank')
                }}
                className="px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200"
              >
                Share
              </button>
              <button 
                onClick={() => navigate(`/edit-order/${quotation._id}`)}
                className="px-3 py-2 bg-amber-50 text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-100"
              >
                Edit
              </button>
              <button 
                onClick={() => { setQuotationToDelete(quotation._id); setShowDeleteModal(true); }}
                className="px-3 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Card View */}
      <div className="hidden md:block">
        {/* Table Headers */}
        <div className="bg-slate-50 rounded-t-xl p-4 border border-gray-200 border-b-0">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
            <div className="col-span-2">Quote ID</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-1">Items</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-3">Actions</div>
          </div>
        </div>
        
        <div className="space-y-0 border border-gray-200 rounded-b-xl overflow-hidden">
        {quotations.map((quotation, index) => (
          <div
            key={quotation._id}
            className={`p-4 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
          >
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2 text-sm font-medium text-gray-800 truncate">
                {quotation.quoteId || `#QT-${quotation._id?.slice(-6)}` || 'N/A'}
              </div>
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-800 truncate">{quotation.customerName}</div>
                <div className="text-xs text-gray-500 truncate">{quotation.customerEmail}</div>
              </div>
              <div className="col-span-1">
                <span className="text-xs bg-slate-100 text-slate-600 px-1 py-1 rounded">
                  {quotation.items?.length || 0}
                </span>
              </div>
              <div className="col-span-2 text-sm font-semibold text-gray-800 truncate">
                {formatIndianCurrency(quotation.totalAmount || 0)}
              </div>
              <div className="col-span-1">
                <select
                  value={quotation.status || 'Pending'}
                  onChange={(e) => handleStatusChange(quotation._id, e.target.value)}
                  className={`w-full px-1 py-1 rounded text-xs font-medium border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                    quotation.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-amber-50 text-amber-600'
                  }`}
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
              <div className="col-span-1 text-xs text-gray-600">
                {new Date(quotation.createdAt).toLocaleDateString()}
              </div>
              <div className="col-span-3 flex gap-1 flex-wrap">
                <button 
                  onClick={() => navigate(`/view-pdf/${quotation._id}`)}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200"
                >
                  PDF
                </button>
                <button 
                  onClick={() => {
                    const shareableUrl = `${window.location.origin}/shared-quotation/${quotation._id}`
                    let message = `🏪 *Computer Shop Quotation*\n\n`
                    message += `👤 *Customer:* ${quotation.customerName}\n`
                    message += `📧 *Email:* ${quotation.customerEmail}\n`
                    message += `📱 *Phone:* ${quotation.customerPhone}\n\n`
                    message += `📋 *Items:*\n`
                    
                    if (quotation.items && quotation.items.length > 0) {
                      quotation.items.forEach((item, index) => {
                        message += `${index + 1}. ${item.name || item.product?.name || 'Product'}\n`
                        message += `   Qty: ${item.quantity} | Rate: ₹${formatIndianNumber(item.price)}\n`
                      })
                    }
                    
                    message += `\n💰 *Total Amount: ₹${formatIndianNumber(quotation.totalAmount?.toFixed(2))}*\n\n`
                    message += `📅 Date: ${new Date(quotation.createdAt).toLocaleDateString()}\n`
                    message += `🔗 View PDF: ${shareableUrl}\n`
                    message += `🙏 Thank you for your business!`
                    
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                    window.open(whatsappUrl, '_blank')
                  }}
                  className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200"
                >
                  Share
                </button>
                <button 
                  onClick={() => navigate(`/edit-order/${quotation._id}`)}
                  className="px-2 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded hover:bg-amber-100"
                >
                  Edit
                </button>
                <button 
                  onClick={() => { setQuotationToDelete(quotation._id); setShowDeleteModal(true); }}
                  className="px-2 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded hover:bg-rose-100"
                >
                  Del
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
      
        {quotations.length === 0 && (
          <div className="text-center py-12 bg-white">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-500 text-lg mb-2">No quotations found</p>
            <p className="text-gray-400 text-sm mb-4">Create your first quotation to get started</p>
            <button 
              onClick={() => navigate('/create-order')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Quotation
            </button>
          </div>
        )}


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Quotation</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this quotation? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setQuotationToDelete(null); }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteQuotation}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
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

export default QuotationList