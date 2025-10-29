import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import axios from 'axios'
import { formatIndianNumber, formatIndianCurrency } from '../utils/formatters'

const SharedOrder = () => {
  const { id } = useParams()
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
 
   // Check if WhatsApp should be shown (for internal use)
  const urlParams = new URLSearchParams(window.location.search)
  const showWhatsApp = urlParams.get('internal') === 'true'





  useEffect(() => {
    // Validate ID format
    if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setError('Invalid order link')
      setLoading(false)
      return
    }

    const fetchOrderData = async () => {
      try {
        // Fetch all data in parallel for faster loading
        const [ordersResponse, productsResponse, categoriesResponse] = await Promise.all([
          axios.get('https://computer-b.vercel.app/api/orders/get'),
          axios.get('https://computer-b.vercel.app/api/products/all'),
          axios.get('https://computer-b.vercel.app/api/categories/all')
        ])
        
        const order = ordersResponse.data.data?.find(order => order._id === id && order.type !== 'Quotation')
        
        if (!order) {
          setError('Order not found')
          setLoading(false)
          return
        }
        
        const allProducts = productsResponse.data
        const allCategories = categoriesResponse.data
        
        const productsWithNames = order.items?.map(item => {
          const product = item.product || {}
          const category = allCategories.find(c => c._id === product.category)
          return {
            name: item.name || product?.name || 'Product',
            orderQuantity: item.quantity,
            sellingRate: item.price,
            description: product?.description || '',
            category: category?.name || ''
          }
        }) || []
        
        setOrderData({
          customer: {
            name: order.customerName,
            email: order.customerEmail,
            phone: order.customerPhone,
            address: order.address || 'Address not provided'
          },
          products: productsWithNames,
          totalAmount: order.totalAmount || 0,
          createdAt: order.createdAt,
          orderId: order.orderId || `OR-${order._id?.slice(-6)}`
        })
      } catch (error) {
        console.error('Error fetching order:', error)
        if (error.response?.status === 404) {
          setError('Order not found')
        } else {
          setError('Failed to load order')
        }
      }
      setLoading(false)
    }
    
    if (id) {
      fetchOrderData()
    }
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 text-lg">{error}</p>
          <p className="text-gray-400 text-sm mt-2">Please check the link and try again</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-gray-500">Order not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Conditional Controls */}
      <div className="no-print p-2 flex justify-end gap-2">
        {showWhatsApp && (
          <button 
            onClick={() => {
              const cleanUrl = `${window.location.origin}/shared-order/${id}`
              const message = `Computer Shop Order\n\nCustomer: ${orderData.customer.name}\nTotal: ${formatIndianCurrency(orderData.totalAmount)}\n\nView PDF: ${cleanUrl}`
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
              window.open(whatsappUrl, '_blank')
            }}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            📱 WhatsApp
          </button>
        )}
        <button 
          onClick={handlePrint}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Print
        </button>
      </div>

      <div className="print-content p-4 bg-white" style={{minHeight: '100vh'}}>
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2">ORDER</h1>
          <p className="text-lg sm:text-xl text-gray-600">Computer Shop</p>
          <hr className="w-24 sm:w-32 mx-auto mt-4 border-gray-300" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-12 mb-6 sm:mb-8 md:mb-12">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 border-b-2 border-gray-200 pb-2">Bill To:</h3>
            <div className="text-gray-700 space-y-1 text-sm sm:text-base">
              <p className="font-semibold text-base sm:text-lg">{orderData.customer.name}</p>
              <p>{orderData.customer.email}</p>
              <p>{orderData.customer.phone}</p>
              <p>{orderData.customer.address}</p>
            </div>
          </div>
          <div className="md:text-right">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 border-b-2 border-gray-200 pb-2">Order Details:</h3>
            <div className="text-gray-700 space-y-1 text-sm sm:text-base">
              <p><span className="font-medium">Date:</span> {new Date(orderData.createdAt).toLocaleDateString()}</p>
              <p><span className="font-medium">Order #:</span> {orderData.orderId}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 sm:mb-12">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-400 min-w-[320px] sm:min-w-[500px]">
            <thead>
              <tr>
                <th className="border-2 border-gray-400 px-2 sm:px-6 py-2 sm:py-4 text-left text-white bg-blue-900 font-bold text-xs sm:text-base">Item Description</th>
                <th className="border-2 border-gray-400 px-2 sm:px-6 py-2 sm:py-4 text-center text-white bg-blue-900 font-bold text-xs sm:text-base">Qty</th>
                <th className="border-2 border-gray-400 px-2 sm:px-6 py-2 sm:py-4 text-right text-white bg-blue-900 font-bold text-xs sm:text-base">Unit Price</th>
                <th className="border-2 border-gray-400 px-2 sm:px-6 py-2 sm:py-4 text-right text-white bg-blue-900 font-bold text-xs sm:text-base">Total</th>
              </tr>
            </thead>
            <tbody>
              {orderData.products.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border border-gray-300 px-2 sm:px-6 py-2 sm:py-4">
                    <div>
                      <p className="font-semibold text-gray-800 text-xs sm:text-base">{item.name}</p>
                      {item.description && <p className="text-xs sm:text-sm text-gray-600">{item.description}</p>}
                      {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-6 py-4 text-center font-medium">{item.orderQuantity}</td>
                  <td className="border border-gray-300 px-6 py-4 text-right font-medium">₹{formatIndianNumber(item.sellingRate)}</td>
                  <td className="border border-gray-300 px-6 py-4 text-right font-bold">₹{formatIndianNumber((item.sellingRate * item.orderQuantity).toFixed(2))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="flex justify-center md:justify-end mb-6 sm:mb-8 md:mb-12">
          <div className="w-full max-w-80 bg-gray-50 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-gray-300">
            <div className="flex justify-between py-2 sm:py-3 border-b border-gray-300 text-sm sm:text-lg">
              <span className="font-medium">Subtotal:</span>
              <span className="font-semibold">₹{formatIndianNumber(orderData.totalAmount.toFixed(2))}</span>
            </div>
            <div className="flex justify-between py-2 sm:py-3 border-b border-gray-300 text-sm sm:text-lg">
              <span className="font-medium">Tax (0%):</span>
              <span className="font-semibold">₹0.00</span>
            </div>
            <div className="flex justify-between py-3 sm:py-4 font-bold text-lg sm:text-2xl text-gray-800 border-t-2 border-gray-400 mt-2">
              <span>TOTAL:</span>
              <span>₹{formatIndianNumber(orderData.totalAmount.toFixed(2))}</span>
            </div>
          </div>
        </div>

        <div className="text-center border-t-2 border-gray-300 pt-6 sm:pt-8">
          <p className="text-base sm:text-lg font-medium text-gray-700 mb-2">Thank you for your business!</p>
          <p className="text-sm sm:text-base text-gray-600">This order confirmation was generated on {new Date().toLocaleDateString()}.</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            box-sizing: border-box;
          }
          .no-print {
            display: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}

export default SharedOrder