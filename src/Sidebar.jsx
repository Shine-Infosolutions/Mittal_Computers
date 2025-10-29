import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation()
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'categories', label: 'Categories', path: '/categories' },
    { id: 'products', label: 'Products', path: '/products' },
    { id: 'bulk-import', label: 'Bulk Import', path: '/bulk-import' },
    { id: 'orders', label: 'Customer List', path: '/orders' },
    { id: 'quotations', label: 'Quotation List', path: '/quotation-list' }
  ]

  return (
    <>
      
      <motion.div 
        className={`sidebar h-screen bg-slate-900 text-white fixed left-0 top-0 shadow-lg transition-all duration-300 z-30 ${
          isOpen 
            ? 'w-64 translate-x-0' 
            : 'w-64 -translate-x-full lg:w-16 lg:translate-x-0'
        }`}
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5 }}
      >
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className={`${isOpen ? 'block' : 'hidden'}`}>
          <h2 className="text-xl font-bold text-white m-0">
            Mittal Computers
          </h2>
          {/* <p className="text-gray-400 text-sm mt-1">Admin Panel</p> */}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
      
      <nav className="py-4">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <Link
              to={item.path}
              onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
              className={`flex items-center mx-2 my-1 px-3 py-3 rounded text-sm ${
                location.pathname === item.path
                  ? 'bg-slate-700 text-white font-medium' 
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
              title={!isOpen ? item.label : ''}
            >
              <span className="w-5 h-5 flex-shrink-0">
                {item.id === 'categories' && '📁'}
                {item.id === 'products' && '📦'}
                {item.id === 'bulk-import' && '📥'}
                {item.id === 'orders' && '📋'}
                {item.id === 'quotations' && '📄'}
                {item.id === 'dashboard' && '📊'}
              </span>
              {isOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          </motion.div>
        ))}
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-800 rounded text-center">
        <p className="text-xs text-gray-400 m-0">v1.0.0</p>
      </div>
    </motion.div>
    </>
  )
}

export default Sidebar