import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import axios from 'axios'

const AddProduct = () => {
  const navigate = useNavigate()
  const location = useLocation()
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
  const [bulkAttributes, setBulkAttributes] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [showAIPrompt, setShowAIPrompt] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchCategories()
    
    // Check if we have product data from bulk import
    if (location.state?.productData) {
      const { productData } = location.state
      setFormData({
        name: productData.name || '',
        category: productData.category || '',
        brand: productData.brand || '',
        modelNumber: productData.modelNumber || '',
        quantity: productData.quantity || 0,
        sellingRate: productData.sellingRate || 0,
        costRate: productData.costRate || 0,
        status: productData.status || 'Active',
        warranty: productData.warranty || '',
        attributes: productData.attributes || {}
      })
    }
  }, [location.state])

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

  const fetchCategoryAttributes = async (categoryId) => {
    try {
      const response = await axios.get(`https://computer-b.vercel.app/api/attributes/category/${categoryId}/attributes`)
      
      if (response.data && response.data.attributes) {
        const fetchedAttrs = Object.keys(response.data.attributes)
        setBackendAttributes(fetchedAttrs)
        
        // Add fetched attributes directly to formData.attributes
        setFormData(prev => ({
          ...prev,
          attributes: {
            ...prev.attributes,
            ...response.data.attributes
          }
        }))
      }
      setCategoryAttributes([])
    } catch (error) {
      console.error('Error fetching category attributes:', error)
      setCategoryAttributes([])
    }
  }

  const handleCategoryChange = (categoryId) => {
    console.log('Category changed to:', categoryId)
    setFormData({ ...formData, category: categoryId, attributes: {} })
    setBackendAttributes([])
    if (categoryId) {
      fetchCategoryAttributes(categoryId)
    } else {
      setCategoryAttributes([])
    }
    setNewAttribute({ key: '', value: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('https://computer-b.vercel.app/api/products/create', formData)
      toast.success('Product created successfully!')
      navigate('/products')
    } catch (error) {
      console.error('Error creating product:', error)
      toast.error('Failed to create product')
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

  const addBulkAttributes = () => {
    if (!bulkAttributes.trim()) return
    
    const lines = bulkAttributes.split('\n')
    const newAttrs = {}
    
    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && trimmedLine.includes(':')) {
        const [key, ...valueParts] = trimmedLine.split(':')
        const value = valueParts.join(':').trim()
        if (key.trim() && value) {
          newAttrs[key.trim()] = value
        }
      }
    })
    
    if (Object.keys(newAttrs).length > 0) {
      setFormData({
        ...formData,
        attributes: {
          ...formData.attributes,
          ...newAttrs
        }
      })
      setBulkAttributes('')
      setShowBulkInput(false)
      toast.success(`Added ${Object.keys(newAttrs).length} attributes`)
    } else {
      toast.error('No valid attributes found. Use format: key: value')
    }
  }

  const generateAll = async () => {
    if (!aiPrompt.trim() && !selectedImage) {
      toast.error('Please enter a product name/link or select an image')
      return
    }
    
    setIsGenerating(true)
    try {
      // Step 1: Extract basic product info with retry logic
      let basicResponse
      let retries = 5
      
      for (let i = 0; i < retries; i++) {
        try {
          basicResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
            contents: [{
              parts: [{
                text: `Extract basic info from: "${aiPrompt}"\n\nReturn only:\nProduct Name: [full product name]\nBrand: [brand name]\nModel Number: [model/part number]\nWarranty: [warranty period]\n\nBe concise and accurate.`
              }]
            }]
          }, {
            headers: { 'Content-Type': 'application/json' }
          })
          break
        } catch (retryError) {
          if (retryError.response?.status === 503 && i < retries - 1) {
            const delay = (i + 1) * 3
            toast.info(`Model overloaded, retrying in ${delay} seconds... (${i + 1}/${retries})`)
            await new Promise(resolve => setTimeout(resolve, delay * 1000))
          } else {
            throw retryError
          }
        }
      }
      
      const basicText = basicResponse.data.candidates[0].content.parts[0].text
      const basicLines = basicText.split('\n')
      let productInfo = {}
      
      basicLines.forEach(line => {
        const trimmedLine = line.trim()
        if (trimmedLine && trimmedLine.includes(':')) {
          const [key, ...valueParts] = trimmedLine.split(':')
          const value = valueParts.join(':').trim()
          const cleanKey = key.trim()
          
          if (cleanKey === 'Product Name' && value) {
            productInfo.name = value
          } else if (cleanKey === 'Brand' && value) {
            productInfo.brand = value
          } else if (cleanKey === 'Model Number' && value) {
            productInfo.modelNumber = value
          } else if (cleanKey === 'Warranty' && value) {
            productInfo.warranty = value
          }
        }
      })
      
      // Step 2: Generate attributes if category is selected
      let aiAttributes = {}
      let finalAttributes = {}
      
      if (formData.category) {
        let existingAttributes = {}
        let existingAttrNames = []
        
        try {
          const attributesResponse = await axios.get(`https://computer-b.vercel.app/api/attributes/category/${formData.category}/attributes`)
          if (attributesResponse.data && attributesResponse.data.attributes) {
            existingAttributes = attributesResponse.data.attributes
          }
          existingAttrNames = Object.keys(existingAttributes)
        } catch (attrError) {
          // 404 means no attributes exist for this category - that's fine
          if (attrError.response?.status !== 404) {
            console.error('Error fetching attributes:', attrError)
          }
          existingAttrNames = []
        }
        
        if (existingAttrNames.length > 0) {
          // Use existing backend attributes
          const attrResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
            contents: [{
              parts: [{
                text: `Analyze this product: "${aiPrompt}"\n\nGenerate accurate values ONLY for these attributes: ${existingAttrNames.join(', ')}\n\nFormat: "attributeName: actualValue"\nEach pair on a new line\nUse REAL specifications\nIf an attribute doesn't apply, use "N/A"`
              }]
            }]
          }, {
            headers: { 'Content-Type': 'application/json' }
          })
          
          const attrText = attrResponse.data.candidates[0].content.parts[0].text
          const attrLines = attrText.split('\n')
          
          attrLines.forEach(line => {
            const trimmedLine = line.trim()
            if (trimmedLine && trimmedLine.includes(':')) {
              const [key, ...valueParts] = trimmedLine.split(':')
              const value = valueParts.join(':').trim()
              if (key.trim() && value && existingAttrNames.includes(key.trim())) {
                aiAttributes[key.trim()] = value
              }
            }
          })
          
          finalAttributes = { ...existingAttributes, ...aiAttributes }
        } else {
          // No backend attributes - generate both names and values with retry logic
          let newAttrResponse
          
          for (let i = 0; i < retries; i++) {
            try {
              newAttrResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
                contents: [{
                  parts: [{
                    text: `Generate relevant technical attributes and values for this product: "${aiPrompt}"\n\nCreate 8-12 important technical specifications\n\nFormat: "attributeName: actualValue"\nEach pair on a new line\nUse REAL specifications\nInclude attributes like: Processor, RAM, Storage, Graphics, Display, etc.`
                  }]
                }]
              }, {
                headers: { 'Content-Type': 'application/json' }
              })
              break
            } catch (retryError) {
              if (retryError.response?.status === 503 && i < retries - 1) {
                const delay = (i + 1) * 3
                toast.info(`Model overloaded, retrying in ${delay} seconds... (${i + 1}/${retries})`)
                await new Promise(resolve => setTimeout(resolve, delay * 1000))
              } else {
                throw retryError
              }
            }
          }
          
          const newAttrText = newAttrResponse.data.candidates[0].content.parts[0].text
          const newAttrLines = newAttrText.split('\n')
          
          newAttrLines.forEach(line => {
            const trimmedLine = line.trim()
            if (trimmedLine && trimmedLine.includes(':')) {
              const [key, ...valueParts] = trimmedLine.split(':')
              const value = valueParts.join(':').trim().replace(/\*\*/g, '').replace(/\*/g, '')
              const cleanKey = key.trim().replace(/\*\*/g, '').replace(/\*/g, '')
              if (cleanKey && value && value !== 'N/A') {
                aiAttributes[cleanKey] = value
              }
            }
          })
          
          finalAttributes = aiAttributes
        }
      }
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        ...productInfo,
        attributes: {
          ...prev.attributes,
          ...finalAttributes
        }
      }))
      
      setShowAIPrompt(false)
      setAiPrompt('')
      setSelectedImage(null)
      
      const message = formData.category 
        ? `Auto-filled product details and ${Object.keys(aiAttributes).length} attributes`
        : 'Auto-filled product details (select category for attributes)'
      toast.success(message)
      
    } catch (error) {
      console.error('Error generating:', error)
      toast.error('Failed to generate product info')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAIAttributes = async () => {
    if (!aiPrompt.trim() && !selectedImage) {
      toast.error('Please enter a product name/link or select an image')
      return
    }
    
    if (!formData.category) {
      toast.error('Please select a category first')
      return
    }
    
    setIsGenerating(true)
    try {
      const attributesResponse = await axios.get(`https://computer-b.vercel.app/api/attributes/category/${formData.category}/attributes`)
      
      let existingAttributes = {}
      if (attributesResponse.data && attributesResponse.data.attributes) {
        existingAttributes = attributesResponse.data.attributes
      }
      
      const existingAttrNames = Object.keys(existingAttributes)
      
      if (existingAttrNames.length === 0) {
        toast.error('No attributes found for this category')
        return
      }
      
      let requestParts = []
      
      if (selectedImage) {
        // Convert image to base64
        const base64Image = selectedImage.split(',')[1]
        requestParts.push({
          text: `Analyze this product image and extract specifications. Generate accurate values ONLY for these attributes: ${existingAttrNames.join(', ')}\n\nFormat: "attributeName: actualValue"\nEach pair on a new line\nUse REAL specifications from the image\nIf an attribute doesn't apply, use "N/A"`
        })
        requestParts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: base64Image
          }
        })
      } else {
        requestParts.push({
          text: `Analyze this product: "${aiPrompt}"\n\nGenerate accurate values ONLY for these attributes: ${existingAttrNames.join(', ')}\n\nFormat: "attributeName: actualValue"\nEach pair on a new line\nUse REAL specifications\nIf an attribute doesn't apply, use "N/A"`
        })
      }
      
      let response
      let retries = 3
      
      for (let i = 0; i < retries; i++) {
        try {
          response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
            contents: [{ parts: requestParts }]
          }, {
            headers: { 'Content-Type': 'application/json' }
          })
          break
        } catch (retryError) {
          if (retryError.response?.status === 503 && i < retries - 1) {
            toast.info(`Model overloaded, retrying in ${(i + 1) * 2} seconds...`)
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000))
          } else {
            throw retryError
          }
        }
      }
      
      const generatedText = response.data.candidates[0].content.parts[0].text
      const lines = generatedText.split('\n')
      const aiAttributes = {}
      
      lines.forEach(line => {
        const trimmedLine = line.trim()
        if (trimmedLine && trimmedLine.includes(':')) {
          const [key, ...valueParts] = trimmedLine.split(':')
          const value = valueParts.join(':').trim()
          if (key.trim() && value && existingAttrNames.includes(key.trim())) {
            aiAttributes[key.trim()] = value
          }
        }
      })
      
      const finalAttributes = { ...existingAttributes, ...aiAttributes }
      
      setFormData(prev => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          ...finalAttributes
        }
      }))
      
      setShowAIPrompt(false)
      setAiPrompt('')
      setSelectedImage(null)
      toast.success(`Generated ${Object.keys(aiAttributes).length} attributes from ${selectedImage ? 'image' : 'text'}`)
    } catch (error) {
      console.error('Error generating AI attributes:', error)
      toast.error('Failed to generate attributes. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImageSelect = async (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        setSelectedImage(e.target.result)
        await identifyProductFromImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const startCamera = async () => {
    try {
      setShowCamera(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (error) {
      console.error('Camera error:', error)
      setShowCamera(false)
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access.')
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.')
      } else {
        toast.error('Failed to access camera. Please try again.')
      }
    }
  }

  const captureImage = async () => {
    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      if (!video || !canvas) {
        toast.error('Camera not ready')
        return
      }
      
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      
      setSelectedImage(imageData)
      stopCamera()
      await identifyProductFromImage(imageData)
    } catch (error) {
      console.error('Error capturing image:', error)
      toast.error('Failed to capture image')
    }
  }

  const stopCamera = () => {
    try {
      const stream = videoRef.current?.srcObject
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
    } catch (error) {
      console.error('Error stopping camera:', error)
    } finally {
      setShowCamera(false)
    }
  }

  const identifyProductFromImage = async (imageData) => {
    if (!formData.category) {
      toast.info('Please select a category first for better product identification')
      return
    }

    try {
      const base64Image = imageData.split(',')[1]
      
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        contents: [{
          parts: [
            {
              text: "Identify this product. Return ONLY the product name/model in this exact format: 'ProductName ModelNumber' (e.g., 'ASUS ROG Strix G15 G513QM' or 'Dell XPS 13 9310'). Be specific and include brand and model."
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      }, {
        headers: { 'Content-Type': 'application/json' }
      })
      
      const productName = response.data.candidates[0].content.parts[0].text.trim()
      
      if (productName && productName !== 'Unable to identify') {
        setAiPrompt(productName)
        toast.success(`Product identified: ${productName}`)
        
        // Auto-generate attributes using the identified product name
        await generateAttributesFromProductName(productName)
      } else {
        toast.info('Could not identify specific product from image')
      }
    } catch (error) {
      console.error('Error identifying product:', error)
      toast.error('Failed to identify product from image')
    }
  }

  const generateAttributesFromProductName = async (productName) => {
    try {
      const attributesResponse = await axios.get(`https://computer-b.vercel.app/api/attributes/category/${formData.category}/attributes`)
      
      let existingAttributes = {}
      if (attributesResponse.data && attributesResponse.data.attributes) {
        existingAttributes = attributesResponse.data.attributes
      }
      
      const existingAttrNames = Object.keys(existingAttributes)
      
      if (existingAttrNames.length === 0) return
      
      toast.info('🔍 Searching internet for product specifications...')
      
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        contents: [{
          parts: [{
            text: `Find complete specifications for: "${productName}"

Extract:
1. Product Details:
- Product Name: [full name]
- Brand: [brand]
- Model Number: [model]
- Warranty: [warranty period]
- Quantity: [typical stock quantity, default 10]
- Selling Rate: [market price in rupees]
- Cost Rate: [wholesale/cost price in rupees]

2. Attributes: ${existingAttrNames.join(', ')}

Format each as: "Field: value"
Give exact values only
Use "N/A" only if truly not found`
          }]
        }]
      }, {
        headers: { 'Content-Type': 'application/json' }
      })
      
      const generatedText = response.data.candidates[0].content.parts[0].text
      const lines = generatedText.split('\n')
      const aiAttributes = {}
      let productInfo = {}
      
      lines.forEach(line => {
        const trimmedLine = line.trim()
        if (trimmedLine && trimmedLine.includes(':')) {
          const [key, ...valueParts] = trimmedLine.split(':')
          const value = valueParts.join(':').trim()
          const cleanKey = key.trim()
          
          if (cleanKey && value && value !== 'N/A') {
            if (cleanKey === 'Product Name') {
              productInfo.name = value
            } else if (cleanKey === 'Brand') {
              productInfo.brand = value
            } else if (cleanKey === 'Model Number') {
              productInfo.modelNumber = value
            } else if (cleanKey === 'Warranty') {
              productInfo.warranty = value
            } else if (cleanKey === 'Quantity') {
              productInfo.quantity = parseInt(value) || 10
            } else if (cleanKey === 'Selling Rate') {
              productInfo.sellingRate = parseFloat(value.replace(/[^\d.]/g, '')) || 0
            } else if (cleanKey === 'Cost Rate') {
              productInfo.costRate = parseFloat(value.replace(/[^\d.]/g, '')) || 0
            } else if (existingAttrNames.includes(cleanKey)) {
              aiAttributes[cleanKey] = value
            }
          }
        }
      })
      
      const finalAttributes = { ...existingAttributes, ...aiAttributes }
      
      setFormData(prev => ({
        ...prev,
        ...productInfo,
        attributes: {
          ...prev.attributes,
          ...finalAttributes
        }
      }))
      
      toast.success(`🌐 Auto-filled product details and ${Object.keys(aiAttributes).length} specifications`)
    } catch (error) {
      console.error('Error generating attributes:', error)
      toast.error('Failed to fetch specifications from internet')
    }
  }



  return (
    <motion.div 
      className="max-w-4xl mx-auto px-4 sm:px-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {location.state?.isEdit ? 'Edit Product Preview' : 'Add New Product'}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {location.state?.isEdit ? 'Review and edit product from bulk import' : 'Add a new product to your inventory'}
          </p>
        </div>
        <motion.button 
          onClick={() => location.state?.isEdit ? navigate('/bulk-import') : navigate('/products')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 whitespace-nowrap"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {location.state?.isEdit ? 'Back to Bulk Import' : 'Back to Products'}
        </motion.button>
      </div>
      
      <motion.div 
        className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
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
            
            {showBulkInput ? (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Bulk Add Attributes (one per line, format: key: value)
                </label>
                <textarea
                  value={bulkAttributes}
                  onChange={(e) => setBulkAttributes(e.target.value)}
                  placeholder={`socketType: AM4\nramType: DDR4\npcieVersion: 4.0\nformFactor: ATX`}
                  className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:border-blue-500 h-24 text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={addBulkAttributes}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Add All
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAttributes('')}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkInput(false)}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Single Add
                  </button>
                </div>
              </div>
            ) : (
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
                <button
                  type="button"
                  onClick={() => setShowBulkInput(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 whitespace-nowrap"
                >
                  Bulk Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAIPrompt(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded hover:from-green-600 hover:to-blue-600 whitespace-nowrap"
                >
                  ✨ Shine Infosolutions AI
                </button>
              </div>
            )}

            {showAIPrompt && (
              <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded">
                <label className="block text-sm font-medium text-green-700 mb-2">
                  🤖 Enter product details or upload/capture image for AI analysis
                </label>
                
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Product name, model, or URL"
                  className="w-full px-3 py-2 border border-green-300 rounded focus:outline-none focus:border-green-500 text-sm mb-2"
                  disabled={isGenerating}
                />
                
                {/* <div className="flex gap-2 mb-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
                    disabled={isGenerating}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm transition-colors"
                    disabled={isGenerating}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Camera
                  </button>
                </div> */}
                
                {selectedImage && (
                  <div className="mb-3">
                    <div className="flex items-start gap-3">
                      <img src={selectedImage} alt="Selected" className="w-32 h-32 object-cover rounded border" />
                      <div className="flex-1">
                        <p className="text-sm text-green-600 mb-1">✅ Image uploaded successfully</p>
                        {aiPrompt && (
                          <p className="text-sm text-blue-600">🔍 Identified: {aiPrompt}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedImage(null); setAiPrompt(''); }}
                      className="mt-2 flex items-center gap-1 text-red-500 text-sm hover:text-red-700 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </div>
                )}
                


                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generateAll}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded hover:from-green-700 hover:to-blue-700 text-sm disabled:opacity-50"
                  >
                    {isGenerating ? '🔄 Generating...' : '✨ Generate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiPrompt(''); setSelectedImage(null); stopCamera(); }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                    disabled={isGenerating}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAIPrompt(false); stopCamera(); }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {Object.keys(formData.attributes).length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500">{Object.keys(formData.attributes).length} attributes added</p>
              </div>
            )}
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
            <motion.button 
              type="submit" 
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {location.state?.isEdit ? 'Save Product' : 'Create Product'}
            </motion.button>
          </div>
        </form>
      </motion.div>
      
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Capture Product Image</h3>
            </div>
            <div className="mb-4">
              <video ref={videoRef} autoPlay className="w-full h-64 bg-gray-200 rounded border object-cover" />
            </div>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={captureImage}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Capture
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  )
}

export default AddProduct