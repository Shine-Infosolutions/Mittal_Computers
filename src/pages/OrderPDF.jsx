import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const OrderPDF = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Indian number formatting function
  const formatIndianNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
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
        setError('Failed to load order')
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-gray-500">Order not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Action Buttons */}
      <div className="no-print">
        {/* Back Button - Responsive positioning */}
        <div className="fixed top-4 left-4 lg:left-72 z-50">
          <button 
            onClick={() => navigate('/orders')}
            className="group px-3 py-2 lg:px-4 lg:py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg lg:rounded-xl hover:from-gray-700 hover:to-gray-800 shadow-lg lg:shadow-xl hover:shadow-xl lg:hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1 lg:gap-2 font-medium text-sm lg:text-base"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
        
        {/* Action Buttons - Responsive layout */}
        <div className="fixed top-4 right-4 z-50 flex flex-col sm:flex-row gap-2 lg:gap-3">
          <button 
            onClick={() => {
              const shareableUrl = `${window.location.origin}/shared-order/${id}`
              navigator.clipboard.writeText(shareableUrl)
              const message = `Computer Shop Order\n\nOrder ID: ${id}\n\nView PDF: ${shareableUrl}`
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
              
              setTimeout(() => {
                if (confirm('PDF link copied! Open WhatsApp to share?')) {
                  window.open(whatsappUrl, '_blank')
                }
              }, 500)
            }}
            className="group px-3 py-2 lg:px-4 lg:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg lg:rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg lg:shadow-xl hover:shadow-xl lg:hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1 lg:gap-2 font-medium text-sm lg:text-base"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
            </svg>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button 
            onClick={handlePrint}
            className="group px-3 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg lg:rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg lg:shadow-xl hover:shadow-xl lg:hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1 lg:gap-2 font-medium text-sm lg:text-base"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="print-content p-4 sm:p-6 lg:p-8 bg-white mt-16 sm:mt-20">
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">ORDER</h1>
          <p className="text-lg sm:text-xl text-gray-600">Computer Shop</p>
          <hr className="w-24 sm:w-32 mx-auto mt-4 border-gray-300" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 mb-8 lg:mb-12">
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-3 lg:mb-4 border-b-2 border-gray-200 pb-2">Bill To:</h3>
            <div className="text-gray-700 space-y-1">
              <p className="font-semibold text-base lg:text-lg">{orderData.customer.name}</p>
              <p>{orderData.customer.email}</p>
              <p>{orderData.customer.phone}</p>
              <p>{orderData.customer.address}</p>
            </div>
          </div>
          <div className="lg:text-right">
            <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-3 lg:mb-4 border-b-2 border-gray-200 pb-2">Order Details:</h3>
            <div className="text-gray-700 space-y-1">
              <p><span className="font-medium">Date:</span> {new Date(orderData.createdAt).toLocaleDateString()}</p>
              <p><span className="font-medium">Order #:</span> {orderData.orderId}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 lg:mb-12">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-400">
              <thead>
                <tr>
                  <th className="border-2 border-gray-400 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 text-left text-white bg-blue-900 font-bold text-xs sm:text-sm lg:text-base">Item Description</th>
                  <th className="border-2 border-gray-400 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 text-center text-white bg-blue-900 font-bold text-xs sm:text-sm lg:text-base">Qty</th>
                  <th className="border-2 border-gray-400 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 text-right text-white bg-blue-900 font-bold text-xs sm:text-sm lg:text-base">Unit Price</th>
                  <th className="border-2 border-gray-400 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 text-right text-white bg-blue-900 font-bold text-xs sm:text-sm lg:text-base">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderData.products.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border border-gray-300 px-2 sm:px-4 lg:px-6 py-2 lg:py-4">
                      <div>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm lg:text-base">{item.name}</p>
                        {item.description && <p className="text-xs sm:text-sm text-gray-600">{item.description}</p>}
                        {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 text-center font-medium text-xs sm:text-sm lg:text-base">{item.orderQuantity}</td>
                    <td className="border border-gray-300 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 text-right font-medium text-xs sm:text-sm lg:text-base">₹{formatIndianNumber(item.sellingRate)}</td>
                    <td className="border border-gray-300 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 text-right font-bold text-xs sm:text-sm lg:text-base">₹{formatIndianNumber((item.sellingRate * item.orderQuantity).toFixed(2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mb-8 lg:mb-12">
          <div className="w-full sm:w-80 bg-gray-50 p-4 lg:p-6 rounded-lg border-2 border-gray-300">
            <div className="flex justify-between py-2 lg:py-3 border-b border-gray-300 text-sm lg:text-lg">
              <span className="font-medium">Subtotal:</span>
              <span className="font-medium">₹{formatIndianNumber(orderData.totalAmount?.toFixed(2) || '0.00')}</span>
            </div>
            <div className="flex justify-between py-2 lg:py-3 border-b border-gray-300 text-sm lg:text-lg">
              <span className="font-medium">Tax (0%):</span>
              <span className="font-medium">₹0.00</span>
            </div>
            <div className="flex justify-between py-3 lg:py-4 text-lg lg:text-xl font-bold text-gray-800 border-t-2 border-gray-400 mt-2">
              <span>TOTAL:</span>
              <span>₹{formatIndianNumber(orderData.totalAmount?.toFixed(2) || '0.00')}</span>
            </div>
          </div>
        </div>

        <div className="text-center border-t-2 border-gray-300 pt-6 lg:pt-8">
          <p className="text-base lg:text-lg font-medium text-gray-800 mb-2">Thank you for your business!</p>
          <p className="text-sm lg:text-base text-gray-600">This order confirmation was generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}

export default OrderPDF