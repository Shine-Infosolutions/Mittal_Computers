import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BulkImport = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [step, setStep] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [manualProducts, setManualProducts] = useState('');
  const [processingManual, setProcessingManual] = useState(false);
  const [generatingAI, setGeneratingAI] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/categories/all');
      const data = Array.isArray(response.data) ? response.data : 
                   (response.data?.categories || response.data?.data || []);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setResults(null);
      } else {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        e.target.value = '';
      }
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get('https://computer-b.vercel.app/api/bulk-import/template', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'product-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category first');
      return;
    }
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('categoryId', selectedCategory);

    try {
      const response = await axios.post(
        'https://computer-b.vercel.app/api/bulk-import/products',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setResults(response.data.data);
      setSelectedProducts([]);
      toast.success(response.data.message);
      setFile(null);
      document.getElementById('fileInput').value = '';
      setStep(3);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to import products');
    } finally {
      setUploading(false);
    }
  };

  const handleProductSelect = (index, checked) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, results.success[index].productData]);
    } else {
      setSelectedProducts(selectedProducts.filter((_, i) => i !== selectedProducts.findIndex(p => p.name === results.success[index].productData.name)));
    }
  };

  const createSelectedProductsHandler = async () => {
    if (!selectedProducts.length) {
      toast.error('Please select products to create');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post('https://computer-b.vercel.app/api/bulk-import/create', {
        selectedProducts
      });
      toast.success(response.data.message);
      setStep(1);
      setResults(null);
      setSelectedProducts([]);
      setSelectedCategory('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create products');
    } finally {
      setCreating(false);
    }
  };

  const processManualProducts = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category first');
      return;
    }
    if (!manualProducts.trim()) {
      toast.error('Please enter product names');
      return;
    }

    setProcessingManual(true);
    try {
      // Create a temporary Excel-like data structure for the backend
      const productNames = manualProducts.split('\n').filter(name => name.trim());
      const excelData = productNames.map(name => ({
        name: name.trim(),
        sellingRate: 1000 // Default selling rate
      }));

      // Send to backend for AI processing
      const response = await axios.post(
        'https://computer-b.vercel.app/api/bulk-import/products',
        {
          manualData: excelData,
          categoryId: selectedCategory
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setResults(response.data.data);
      setSelectedProducts([]);
      toast.success(response.data.message);
      setManualProducts('');
      setStep(3);
    } catch (error) {
      console.error('Manual processing error:', error);
      toast.error(error.response?.data?.message || 'Failed to process manual products');
    } finally {
      setProcessingManual(false);
    }
  };

  const generateAIAttributesForProduct = async (productIndex) => {
    const product = results.success[productIndex];
    if (!product) return;

    setGeneratingAI(prev => ({ ...prev, [productIndex]: true }));
    
    try {
      // Get category attributes
      const attributesResponse = await axios.get(`https://computer-b.vercel.app/api/attributes/category/${selectedCategory}/attributes`);
      
      let existingAttributes = {};
      if (attributesResponse.data && attributesResponse.data.attributes) {
        existingAttributes = attributesResponse.data.attributes;
      }
      
      const existingAttrNames = Object.keys(existingAttributes);
      
      if (existingAttrNames.length === 0) {
        // Generate new attributes
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
          contents: [{
            parts: [{
              text: `Generate relevant technical attributes and values for this product: "${product.name}"\n\nCreate 8-12 important technical specifications\n\nFormat: "attributeName: actualValue"\nEach pair on a new line\nUse REAL specifications\nInclude attributes like: Processor, RAM, Storage, Graphics, Display, etc.`
            }]
          }]
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const text = response.data.candidates[0].content.parts[0].text;
        const lines = text.split('\n');
        const aiAttributes = {};
        
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.includes(':')) {
            const [key, ...valueParts] = trimmedLine.split(':');
            const value = valueParts.join(':').trim().replace(/\*\*/g, '').replace(/\*/g, '');
            const cleanKey = key.trim().replace(/\*\*/g, '').replace(/\*/g, '');
            if (cleanKey && value && value !== 'N/A' && value.toLowerCase() !== 'n/a' && value.toLowerCase() !== 'not applicable') {
              aiAttributes[cleanKey] = value;
            }
          }
        });
        
        // Update the product with AI attributes
        const updatedResults = { ...results };
        updatedResults.success[productIndex].productData.attributes = aiAttributes;
        updatedResults.success[productIndex].attributesAdded = Object.keys(aiAttributes).length;
        setResults(updatedResults);
        
        console.log('Generated new attributes:', aiAttributes);
        toast.success(`Generated ${Object.keys(aiAttributes).length} AI attributes for ${product.name}`);
      } else {
        // Use existing attributes
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
          contents: [{
            parts: [{
              text: `Analyze this product: "${product.name}"\n\nGenerate accurate values ONLY for these attributes: ${existingAttrNames.join(', ')}\n\nFormat: "attributeName: actualValue"\nEach pair on a new line\nUse REAL specifications\nIf an attribute doesn't apply, use "N/A"`
            }]
          }]
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const text = response.data.candidates[0].content.parts[0].text;
        const lines = text.split('\n');
        const aiAttributes = {};
        
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.includes(':')) {
            const [key, ...valueParts] = trimmedLine.split(':');
            const value = valueParts.join(':').trim();
            if (key.trim() && value && existingAttrNames.includes(key.trim()) && value !== 'N/A' && value.toLowerCase() !== 'n/a') {
              aiAttributes[key.trim()] = value;
            }
          }
        });
        
        const finalAttributes = { ...existingAttributes, ...aiAttributes };
        
        // Update the product with AI attributes
        const updatedResults = { ...results };
        updatedResults.success[productIndex].productData.attributes = finalAttributes;
        updatedResults.success[productIndex].attributesAdded = Object.keys(finalAttributes).length;
        setResults(updatedResults);
        
        console.log('Generated attributes:', finalAttributes);
        toast.success(`Generated ${Object.keys(aiAttributes).length} AI attributes for ${product.name}`);
      }
    } catch (error) {
      console.error('Error generating AI attributes:', error);
      toast.error(`Failed to generate AI attributes for ${product.name}`);
    } finally {
      setGeneratingAI(prev => ({ ...prev, [productIndex]: false }));
    }
  };

  const generateAIForAllProducts = async () => {
    if (!results?.success?.length) return;
    
    toast.info(`🤖 Starting AI generation for ${results.success.length} products...`);
    
    for (let i = 0; i < results.success.length; i++) {
      await generateAIAttributesForProduct(i);
      // Small delay between requests to avoid rate limiting
      if (i < results.success.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    toast.success('✅ AI attribute generation completed for all products!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-2xl p-4 sm:p-8 border border-blue-200">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">Bulk Product Import</h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Step {step}: {step === 1 ? 'Select Category' : step === 2 ? 'Upload Excel File' : 'Review Results'}
          </p>
        </div>
      </div>

      {/* Step 1: Category Selection */}
      {step === 1 && (
        <motion.div 
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📁 Select Product Category</h2>
          <p className="text-gray-600 mb-6">Choose the category for the products you want to import</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <motion.div
                key={category._id}
                onClick={() => {
                  setSelectedCategory(category._id);
                  setStep(2);
                }}
                className="p-4 border-2 rounded-xl cursor-pointer transition-all border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <h3 className="font-medium text-gray-800">{category.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{category.description || 'No description'}</p>
              </motion.div>
            ))}
          </div>
          
          {categories.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No categories found. Please create categories first.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Step 2: File Upload */}
      {step === 2 && (
        <motion.div 
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">📦 Upload Products for: {categories.find(c => c._id === selectedCategory)?.name}</h2>
            <button 
              onClick={() => setStep(1)}
              className="text-blue-600 hover:text-blue-800"
            >
              Change Category
            </button>
          </div>
          
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-4">
              <motion.button
                onClick={downloadTemplate}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                📥 Download Template
              </motion.button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-medium text-blue-800 mb-2">✍️ Or Add Products Manually</h3>
              <p className="text-sm text-blue-600 mb-3">Enter product names (one per line):</p>
              <textarea
                value={manualProducts}
                onChange={(e) => setManualProducts(e.target.value)}
                placeholder={`Intel Core i5-12400F\nAMD Ryzen 5 5600X\nNVIDIA RTX 4070\nCorsair Vengeance LPX 16GB`}
                className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:border-blue-500 h-32 text-sm"
                disabled={processingManual}
              />
              <motion.button
                onClick={processManualProducts}
                disabled={processingManual || !manualProducts.trim()}
                className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                whileHover={!processingManual ? { scale: 1.02 } : {}}
                whileTap={!processingManual ? { scale: 0.98 } : {}}
              >
                {processingManual ? '🤖 AI Processing...' : '🚀 Process with AI'}
              </motion.button>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            
            <input
              id="fileInput"
              type="file"
              accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <label htmlFor="fileInput" className="cursor-pointer">
              <span className="text-lg font-medium text-gray-700">
                {file ? file.name : 'Choose Excel file or drag and drop'}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                Supports .xlsx and .xls files up to 10MB
              </p>
            </label>
          </div>

          {file && (
            <motion.div 
              className="mt-6 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.button
                onClick={handleUpload}
                disabled={uploading}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!uploading ? { scale: 1.02, y: -1 } : {}}
                whileTap={!uploading ? { scale: 0.98 } : {}}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  '🚀 Import Products'
                )}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Step 3: Results */}
      {step === 3 && results && (
        <motion.div 
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">📊 Product Preview</h2>
            <div className="flex gap-2">
              <button 
                onClick={generateAIForAllProducts}
                disabled={Object.values(generatingAI).some(Boolean)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
              >
                {Object.values(generatingAI).some(Boolean) ? '🔄 Generating...' : '🤖 AI for All'}
              </button>
              <button 
                onClick={createSelectedProductsHandler}
                disabled={creating || !selectedProducts.length}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                {creating ? 'Creating...' : `Create ${selectedProducts.length} Selected`}
              </button>
              <button 
                onClick={() => { setStep(1); setResults(null); setSelectedCategory(''); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Import More
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.total}</div>
              <div className="text-sm text-blue-700">Total Rows</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results.success.length}</div>
              <div className="text-sm text-green-700">Successfully Imported</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
              <div className="text-sm text-red-700">Errors</div>
            </div>
          </div>

          {results.success.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-blue-700 mb-3">📎 Product Preview - Select to Add</h3>
              <div className="bg-blue-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                {results.success.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-blue-200 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        onChange={(e) => handleProductSelect(index, e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-blue-800">{item.name}</div>
                        <div className="text-xs text-blue-600">₹{item.productData.sellingRate} • {item.attributesAdded} attributes</div>

                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/add-product', { state: { productData: item.productData, isEdit: true } })}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors.length > 0 && (
            <div>
              <h3 className="font-medium text-red-700 mb-3">❌ Import Errors</h3>
              <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                {results.errors.map((error, index) => (
                  <div key={index} className="py-2 border-b border-red-200 last:border-b-0">
                    <div className="text-sm text-red-800">
                      <strong>Row {error.row}:</strong> {error.error}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BulkImport;