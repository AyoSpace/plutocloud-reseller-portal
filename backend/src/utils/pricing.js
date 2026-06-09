// All prices stored in kobo (1 NGN = 100 kobo)
const PRICE_VCPU = parseInt(process.env.PRICE_VCPU) || 2450000;       // ₦24,500
const PRICE_RAM_GB = parseInt(process.env.PRICE_RAM_GB) || 262500;     // ₦2,625
const PRICE_STORAGE_GB = parseInt(process.env.PRICE_STORAGE_GB) || 10800; // ₦108
const PRICE_WINDOWS_OS = parseInt(process.env.PRICE_WINDOWS_OS) || 3000000; // ₦30,000
const RESELLER_DISCOUNT = parseFloat(process.env.RESELLER_DISCOUNT) || 0.20;
const VAT_RATE = parseFloat(process.env.VAT_RATE) || 0.075;
const PAYSTACK_FEE_PERCENT = parseFloat(process.env.PAYSTACK_FEE_PERCENT) || 0.015;
const PAYSTACK_FEE_FLAT = parseInt(process.env.PAYSTACK_FEE_FLAT) || 10000; // ₦100
const PAYSTACK_FEE_CAP = parseInt(process.env.PAYSTACK_FEE_CAP) || 200000; // ₦2,000

function calculateVMPrice(vcpu, ramGb, storageGb, os, isReseller = false) {
  const isWindows = os && os.startsWith('windows');

  // Base price in kobo
  let basePrice = (vcpu * PRICE_VCPU) + (ramGb * PRICE_RAM_GB) + (storageGb * PRICE_STORAGE_GB);
  if (isWindows) basePrice += PRICE_WINDOWS_OS;

  // Reseller discount
  const discount = isReseller ? Math.round(basePrice * RESELLER_DISCOUNT) : 0;
  const priceAfterDiscount = basePrice - discount;

  // VAT
  const vat = Math.round(priceAfterDiscount * VAT_RATE);
  const priceWithVat = priceAfterDiscount + vat;

  // Paystack fee (passed to customer)
  let paystackFee = Math.round(priceWithVat * PAYSTACK_FEE_PERCENT) + PAYSTACK_FEE_FLAT;
  if (paystackFee > PAYSTACK_FEE_CAP) paystackFee = PAYSTACK_FEE_CAP;

  const total = priceWithVat + paystackFee;

  return {
    basePriceKobo: basePrice,
    discountKobo: discount,
    vatKobo: vat,
    paystackFeeKobo: paystackFee,
    totalKobo: total,
    // For display
    basePriceNgn: basePrice / 100,
    discountNgn: discount / 100,
    vatNgn: vat / 100,
    paystackFeeNgn: paystackFee / 100,
    totalNgn: total / 100,
  };
}

function formatNaira(kobo) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}

function calculateResellerEarning(orderBasePriceKobo) {
  return Math.round(orderBasePriceKobo * RESELLER_DISCOUNT);
}

module.exports = {
  calculateVMPrice,
  formatNaira,
  calculateResellerEarning,
  RESELLER_DISCOUNT,
  VAT_RATE,
};
