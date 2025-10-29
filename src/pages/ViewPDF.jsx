import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const ViewPDF = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotationData, setQuotationData] = useState(null)
  const [loading, setLoading] = useState(true)

  const formatIndianNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  useEffect(() => {
    const fetchQuotationData = async () => {
      try {
        console.log('Fetching quotation with ID:', id)
        const [quotationResponse, categoriesResponse] = await Promise.all([
          axios.get('https://computer-b.vercel.app/api/orders/quotations/search'),
          axios.get('https://computer-b.vercel.app/api/categories/all')
        ])
        console.log('Quotation response:', quotationResponse.data)
        
        const quotation = quotationResponse.data.data?.find(q => q._id === id)
        console.log('Found quotation:', quotation)
        
        if (!quotation) {
          console.log('No quotation found')
          setLoading(false)
          return
        }
        
        const allCategories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : 
                              (categoriesResponse.data?.categories || categoriesResponse.data?.data || [])
        
        const productsWithNames = quotation.items?.map(item => {
          const product = item.product || {}
          const category = allCategories.find(c => c._id === product.category)
          return {
            name: item.name || product?.name || 'Product',
            orderQuantity: item.quantity,
            sellingRate: item.price,
            description: product?.description || '',
            category: category?.name || 'No Category'
          }
        }) || []
        
        console.log('Processed products:', productsWithNames)
        
        setQuotationData({
          customer: {
            name: quotation.customerName,
            email: quotation.customerEmail,
            phone: quotation.customerPhone,
            address: quotation.address || 'Address not provided'
          },
          products: productsWithNames,
          totalAmount: quotation.totalAmount || 0,
          createdAt: quotation.createdAt,
          quoteId: quotation.quoteId || `#QT-${quotation._id?.slice(-6)}` || 'N/A',
          status: quotation.status || 'Pending'
        })
      } catch (error) {
        console.error('Error fetching quotation:', error)
      }
      setLoading(false)
    }
    
    if (id) fetchQuotationData()
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  if (!quotationData) {
    console.log('No quotation data available')
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Quotation not found</p></div>
  }
  
  console.log('Rendering with quotation data:', quotationData)

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Action Buttons */}
      <div className="no-print">
        {/* Action Buttons - Responsive layout */}
        <div className="fixed top-4 right-4 z-50 flex flex-col sm:flex-row gap-2 lg:gap-3">
          <button 
            onClick={() => navigate('/quotation-list')}
            className="group px-3 py-2 lg:px-4 lg:py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg lg:rounded-xl hover:from-gray-700 hover:to-gray-800 shadow-lg lg:shadow-xl hover:shadow-xl lg:hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1 lg:gap-2 font-medium text-sm lg:text-base"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <button 
            onClick={() => {
              const shareableUrl = `${window.location.origin}/shared-quotation/${id}`
              let message = `🏪 *Computer Shop Quotation*\n\n`
              message += `👤 *Customer:* ${quotationData.customer.name}\n`
              message += `📧 *Email:* ${quotationData.customer.email}\n`
              message += `📱 *Phone:* ${quotationData.customer.phone}\n\n`
              message += `📋 *Items:*\n`
              
              quotationData.products.forEach((item, index) => {
                message += `${index + 1}. ${item.name}\n`
                message += `   Qty: ${item.orderQuantity} | Rate: ₹${formatIndianNumber(item.sellingRate)}\n`
              })
              
              message += `\n💰 *Total Amount: ₹${formatIndianNumber(quotationData.totalAmount?.toFixed(2))}*\n\n`
              message += `📅 Date: ${new Date(quotationData.createdAt).toLocaleDateString()}\n`
              message += `🔗 View PDF: ${shareableUrl}\n`
              message += `🙏 Thank you for your business!`
              
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
              window.open(whatsappUrl, '_blank')
            }}
            className="group px-3 py-2 lg:px-4 lg:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg lg:rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg lg:shadow-xl hover:shadow-xl lg:hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1 lg:gap-2 font-medium text-sm lg:text-base"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
            </svg>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="group px-3 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg lg:rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg lg:shadow-xl hover:shadow-xl lg:hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1 lg:gap-2 font-medium text-sm lg:text-base"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      <div className="print-content p-4 sm:p-6 lg:p-8 mt-16 sm:mt-20">

        
        {/* Simple Invoice Header */}
        <div className="p-6 mb-0 border-b-2 border-blue-800">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-800">INVOICE</h1>
              <h2 className="text-xl font-semibold text-gray-700 mb-1">Mittal Computers</h2>
              <p className="text-gray-600 text-sm">1st Floor Pushpanjali Complex, Near Shahi Market,<br />Cinema Road, Shahi Market-273001</p>
            </div>
            <div className="flex flex-col items-center">
              <img src="/logo.jpg" alt="Company Logo" className="w-24 h-24 mb-2" />
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{quotationData.quoteId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="bg-white p-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Bill To:</h3>
              <div className="text-gray-700 space-y-1">
                <p><span className="font-medium">Name:</span> <span className="font-semibold">{quotationData.customer.name}</span></p>
                <p><span className="font-medium">Email:</span> {quotationData.customer.email}</p>
                <p><span className="font-medium">Phone:</span> {quotationData.customer.phone}</p>
                <p><span className="font-medium">Address:</span> {quotationData.customer.address}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-2">
                <p><span className="font-medium text-gray-600">Date:</span> <span className="font-semibold">{new Date(quotationData.createdAt).toLocaleDateString()}</span></p>
                <p><span className="font-medium text-gray-600">Status:</span> <span className={`px-2 py-1 rounded text-sm font-medium ${
                  quotationData.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>{quotationData.status}</span></p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="bg-blue-800 px-6 py-4 text-left text-white font-bold border border-gray-300">Item Description</th>
                  <th className="bg-blue-800 px-6 py-4 text-center text-white font-bold border border-gray-300">Qty</th>
                  <th className="bg-blue-800 px-6 py-4 text-right text-white font-bold border border-gray-300">Unit Price</th>
                  <th className="bg-blue-800 px-6 py-4 text-right text-white font-bold border border-gray-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotationData.products.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-6 py-4">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      {item.description && item.description !== 'N/A' && item.description.trim() && (
                        <p className="text-sm text-gray-600">{item.description}</p>
                      )}
                      {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center font-medium">{item.orderQuantity}</td>
                    <td className="border border-gray-300 px-6 py-4 text-right font-medium">₹{formatIndianNumber(item.sellingRate)}</td>
                    <td className="border border-gray-300 px-6 py-4 text-right font-bold">₹{formatIndianNumber((item.sellingRate * item.orderQuantity).toFixed(2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <table className="w-80 border-collapse border border-gray-300">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 font-medium text-gray-700">Subtotal:</td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-800">₹{formatIndianNumber(quotationData.totalAmount.toFixed(2))}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 font-medium text-gray-700">Tax (0%):</td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-800">₹0.00</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 bg-blue-800 text-white font-bold text-lg">TOTAL:</td>
                  <td className="border border-gray-300 px-4 py-3 bg-blue-800 text-white text-right font-bold text-lg">₹{formatIndianNumber(quotationData.totalAmount.toFixed(2))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Simple Invoice Footer */}
        <div className="p-6 text-center border-t-2 border-blue-800">
          <p className="text-lg font-medium mb-2 text-gray-800">Thank you for your business!</p>
          <p className="text-gray-600">This quotation is valid for 15 days from the date of issue.</p>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export default ViewPDF