// Indian number formatting utility
export const formatIndianNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(num)
}

export const formatIndianCurrency = (num) => {
  return `₹${formatIndianNumber(num)}`
}