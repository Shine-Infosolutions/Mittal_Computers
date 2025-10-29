import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import axios from 'axios'
import { formatIndianNumber, formatIndianCurrency } from '../utils/formatters'

const SharedQuotation = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isClean = searchParams.get('clean') === 'true'
  const [quotationData, setQuotationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Validate ID format
    if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setError('Invalid quotation link')
      setLoading(false)
      return
    }

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
        
        const allCategories = categoriesResponse.data
        
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
          quoteId: quotation.quoteId || `QT-${quotation._id?.slice(-6)}`,
          status: quotation.status || 'Pending'
        })
      } catch (error) {
        console.error('Error fetching quotation:', error)
        if (error.response?.status === 404) {
          setError('Quotation not found')
        } else {
          setError('Failed to load quotation')
        }
      }
      setLoading(false)
    }
    
    if (id) {
      fetchQuotationData()
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

  if (!quotationData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-gray-500">Quotation not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Controls */}
      <div className="no-print p-2 flex justify-end gap-2">
        <button 
          onClick={handlePrint}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Print
        </button>
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
                <p className="text-sm text-gray-600">Invoice #</p>
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
          <p className="text-gray-600">This quotation is valid for 30 days from the date of issue.</p>
        </div>
      </div>

      <style jsx global>{`
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

export default SharedQuotation