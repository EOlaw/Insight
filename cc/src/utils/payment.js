const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const moment = require('moment');

// Calendar of fixed holidays
const FIXED_HOLIDAYS = {
  '01-01': 'New Year\'s Day',
  '07-04': 'Independence Day',
  '12-25': 'Christmas Day',
  // Add more fixed holidays as needed
};

// Function to calculate Easter Sunday (it changes every year)
const calculateEaster = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return moment([year, month - 1, day]);
};

// Function to check if a date is a holiday
const isHoliday = (date) => {
  const momentDate = moment(date);
  const dateString = momentDate.format('MM-DD');
  const year = momentDate.year();

  // Check fixed holidays
  if (FIXED_HOLIDAYS[dateString]) return FIXED_HOLIDAYS[dateString];

  // Check Easter and related holidays
  const easter = calculateEaster(year);
  if (momentDate.isSame(easter, 'day')) return 'Easter Sunday';
  if (momentDate.isSame(easter.clone().subtract(2, 'days'), 'day')) return 'Good Friday';
  if (momentDate.isSame(easter.clone().add(1, 'day'), 'day')) return 'Easter Monday';

  // Check floating holidays
  if (momentDate.day() === 1 && momentDate.month() === 8 && momentDate.date() <= 7) return 'Labor Day';
  if (momentDate.day() === 4 && momentDate.month() === 10 && momentDate.date() >= 22 && momentDate.date() <= 28) return 'Thanksgiving Day';

  // Add more holiday checks as needed

  return null;
};

// Function to calculate seasonal factors
const getSeasonalFactor = (date) => {
  const month = moment(date).month();
  if (month >= 5 && month <= 7) return { factor: 1.1, name: 'Summer Peak' }; // 10% increase in summer
  if (month >= 11 || month <= 1) return { factor: 0.9, name: 'Winter Discount' }; // 10% discount in winter
  return { factor: 1, name: null };
};

// Function to calculate demand-based factors
const getDemandFactor = (date) => {
  const dayOfWeek = moment(date).day();
  const hour = moment(date).hour();
  
  if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekdays
    if (hour >= 9 && hour <= 17) return { factor: 1.2, name: 'Peak Hours' }; // 20% increase during business hours
    return { factor: 1, name: null };
  } else { // Weekends
    return { factor: 0.9, name: 'Weekend Discount' }; // 10% discount on weekends
  }
};

// Function to calculate loyalty discount
const getLoyaltyDiscount = (client) => {
  const consultationCount = client.consultationHistory.length;
  if (consultationCount > 20) return { factor: 0.85, name: 'Platinum Client' }; // 15% discount for very loyal clients
  if (consultationCount > 10) return { factor: 0.9, name: 'Gold Client' }; // 10% discount for loyal clients
  if (consultationCount > 5) return { factor: 0.95, name: 'Silver Client' }; // 5% discount for regular clients
  return { factor: 1, name: null };
};

// Function to calculate urgency fee
const getUrgencyFee = (date, minimumNoticeTime) => {
  const hoursTillConsultation = moment(date).diff(moment(), 'hours');
  if (hoursTillConsultation <= minimumNoticeTime) {
    return { factor: 1.3, name: 'Urgent Booking Fee' };
  }
  return { factor: 1, name: null };
};

// Main function to calculate the final price
const calculatePrice = (service, duration, selectedOptions = [], consultant, dateTime, client) => {
  console.log('calculatePrice function called with:', { service, duration, selectedOptions, consultant, dateTime, client });

  if (!service || !service.basePrice) {
      console.error('Invalid service or basePrice');
      return { finalPrice: 0, appliedFactors: [], currency: 'USD' };
  }

  let basePrice = service.basePrice;
  console.log('Base price:', basePrice);

  // Apply duration factor for hourly services
  if (service.priceModel === 'Hourly') {
      basePrice = (basePrice / 60) * duration;
  }

  // Add prices for additional options
  selectedOptions.forEach(option => {
      const additionalOption = service.additionalOptions.find(o => o.name === option);
      if (additionalOption) {
          basePrice += additionalOption.price;
      }
  });

  let appliedFactors = [];
  let finalPrice = basePrice;

  try {
      // Apply consultant experience factor
      const experienceFactor = 1 + (Math.min(consultant.yearsOfExperience || 0, 20) * 0.01);
      finalPrice *= experienceFactor;
      appliedFactors.push({ name: 'Consultant Experience', factor: experienceFactor });

      // Apply seasonal factor
      const { factor: seasonalFactor, name: seasonName } = getSeasonalFactor(dateTime);
      finalPrice *= seasonalFactor;
      if (seasonName) appliedFactors.push({ name: seasonName, factor: seasonalFactor });

      // Apply demand factor
      const { factor: demandFactor, name: demandName } = getDemandFactor(dateTime);
      finalPrice *= demandFactor;
      if (demandName) appliedFactors.push({ name: demandName, factor: demandFactor });

      // Apply loyalty discount
      const { factor: loyaltyFactor, name: loyaltyName } = getLoyaltyDiscount(client);
      finalPrice *= loyaltyFactor;
      if (loyaltyName) appliedFactors.push({ name: loyaltyName, factor: loyaltyFactor });

      // Apply urgency fee
      const { factor: urgencyFactor, name: urgencyName } = getUrgencyFee(dateTime, service.minimumNoticeTime);
      finalPrice *= urgencyFactor;
      if (urgencyName) appliedFactors.push({ name: urgencyName, factor: urgencyFactor });

      // Apply holiday discount
      const holidayName = isHoliday(dateTime);
      if (holidayName) {
          const holidayFactor = 0.9; // 10% discount on holidays
          finalPrice *= holidayFactor;
          appliedFactors.push({ name: `Holiday: ${holidayName}`, factor: holidayFactor });
      }

      // Ensure finalPrice is a valid number and at least 0.50
      if (isNaN(finalPrice) || !isFinite(finalPrice) || finalPrice < 0.50) {
        throw new Error('Invalid final price calculated');
      }

      // Round to 2 decimal places
      finalPrice = Math.round(finalPrice * 100) / 100;
  } catch (error) {
    console.error('Error calculating price:', error);
    finalPrice = Math.max(basePrice, 0.50); // Ensure minimum price of 0.50
    appliedFactors = []; // Clear applied factors
  }

  console.log('Final price:', finalPrice);
  console.log('Applied factors:', appliedFactors);

  console.log('Final price:', finalPrice);
  console.log('Applied factors:', appliedFactors);

  return { finalPrice, appliedFactors, currency: service.currency || 'USD' };
};

// Create a Stripe PaymentIntent
const createPaymentIntent = async (amount, currency, description, metadata) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      }
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    throw error;
  }
};

// Confirm a Stripe PaymentIntent
const confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error confirming PaymentIntent:', error);
    throw error;
  }
};

// Process the payment
const processPayment = async (service, duration, selectedOptions, consultant, dateTime, client, paymentMethodId) => {
  try {
    const { finalPrice, appliedFactors, currency } = calculatePrice(service, duration, selectedOptions, consultant, dateTime, client);
    
    const description = `Consultation with ${consultant.user.name} for ${service.name}`;
    const metadata = {
      consultationId: client._id.toString(),
      consultantId: consultant._id.toString(),
      serviceId: service._id.toString(),
      appliedFactors: JSON.stringify(appliedFactors)
    };

    const paymentIntent = await createPaymentIntent(finalPrice, currency, description, metadata);
    const confirmedPaymentIntent = await confirmPaymentIntent(paymentIntent.id, paymentMethodId);

    return {
      success: confirmedPaymentIntent.status === 'succeeded',
      paymentIntentId: confirmedPaymentIntent.id,
      amount: finalPrice,
      currency: currency,
      appliedFactors
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return { success: false, error: error.message };
  }
};

// Process a refund
const processRefund = async (paymentIntentId, amount, reason, currency) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
      reason: reason
    });
    return { success: true, refundId: refund.id, amount: amount, currency: currency };
  } catch (error) {
    console.error('Refund processing error:', error);
    return { success: false, error: error.message };
  }
};

// Generate an invoice
const generateInvoice = async (customer, amount, currency, description, metadata) => {
  try {
    const invoice = await stripe.invoices.create({
      customer: customer,
      auto_advance: true,
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: metadata
    });
    await stripe.invoiceItems.create({
      customer: customer,
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      invoice: invoice.id,
      description: description,
    });
    return { success: true, invoiceId: invoice.id, amount: amount, currency: currency };
  } catch (error) {
    console.error('Invoice generation error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { 
  calculatePrice, 
  createPaymentIntent, 
  confirmPaymentIntent, 
  processPayment,
  processRefund,
  generateInvoice,
  isHoliday,
  getSeasonalFactor,
  getDemandFactor,
  getLoyaltyDiscount,
  getUrgencyFee
};






/*
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const calculatePrice = (service, duration, selectedOptions = [], consultant, dateTime, client) => {
  let totalPrice;
  
  switch (service.priceModel) {
    case 'Fixed':
      totalPrice = service.basePrice;
      break;
    case 'Hourly':
      totalPrice = (service.basePrice / 60) * duration;
      break;
    case 'Variable':
      totalPrice = calculateVariablePrice(service, duration, consultant, dateTime, client);
      break;
    default:
      totalPrice = service.basePrice;
  }

  // Add prices for additional options
  selectedOptions.forEach(option => {
    const additionalOption = service.additionalOptions.find(o => o.name === option);
    if (additionalOption) {
      totalPrice += additionalOption.price;
    }
  });

  return Math.round(totalPrice * 100); // Convert to cents for Stripe
};

const calculateVariablePrice = (service, duration, consultant, dateTime, client) => {
  let basePrice = service.basePrice;
  
  // Factor 1: Consultant Experience
  const experienceMultiplier = 1 + (Math.min(consultant.yearsOfExperience, 10) * 0.05);
  
  // Factor 2: Time of Day
  const hour = dateTime.getHours();
  let timeOfDayMultiplier = 1;
  if (hour < 9 || hour >= 18) {
    timeOfDayMultiplier = 1.2; // 20% increase for outside normal business hours
  }
  
  // Factor 3: Day of Week
  const dayOfWeek = dateTime.getDay();
  let dayOfWeekMultiplier = 1;
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    dayOfWeekMultiplier = 1.5; // 50% increase for weekends
  }
  
  // Factor 4: Seasonal Pricing
  const month = dateTime.getMonth();
  let seasonalMultiplier = 1;
  if (month >= 5 && month <= 7) {
    seasonalMultiplier = 1.2; // 20% increase for summer months (June-August)
  } else if (month >= 11 || month <= 1) {
    seasonalMultiplier = 0.9; // 10% discount for winter months (December-February)
  }
  
  // Factor 5: Demand-based Pricing
  const demandMultiplier = getDemandMultiplier(dateTime);
  
  // Factor 6: Client Loyalty Discount
  let loyaltyDiscount = 1;
  if (client.consultationCount > 10) {
    loyaltyDiscount = 0.9; // 10% discount for loyal clients (more than 10 consultations)
  }
  
  // Factor 7: Last-minute Booking Fee
  let lastMinuteMultiplier = 1;
  const hoursTillConsultation = (dateTime - new Date()) / (1000 * 60 * 60);
  if (hoursTillConsultation < 24) {
    lastMinuteMultiplier = 1.15; // 15% increase for bookings less than 24 hours in advance
  }

  // New Factor: Urgency Fee
  let urgencyMultiplier = 1;
  const daysTillConsultation = (dateTime - new Date()) / (1000 * 60 * 60 * 24);
  if (daysTillConsultation < 3) {
    urgencyMultiplier = 1.25; // 25% increase for bookings less than 3 days in advance
  }
  
  // Calculate final price
  const finalPrice = basePrice * experienceMultiplier * timeOfDayMultiplier * dayOfWeekMultiplier * 
                     seasonalMultiplier * demandMultiplier * loyaltyDiscount * lastMinuteMultiplier * urgencyMultiplier;
  
  // Adjust for duration
  return (finalPrice / 60) * duration;
};

// New function to apply promotional discounts
const applyPromotionalDiscounts = (price, client) => {
  // Example: 15% off for first-time clients
  if (client.consultationCount === 0) {
    return price * 0.85;
  }
  // Add more promotional logic here
  return price;
};

// Placeholder function for demand-based pricing
const getDemandMultiplier = (dateTime) => {
  // Example: Increase prices by 10% on Mondays and Fridays
  const dayOfWeek = dateTime.getDay();
  if (dayOfWeek === 1 || dayOfWeek === 5) {
    return 1.1;
  }
  return 1;
};

const createPaymentIntent = async (amount, currency, description, metadata) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      }
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    throw error;
  }
};

const confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error confirming PaymentIntent:', error);
    throw error;
  }
};

const processPayment = async (amount, currency, paymentMethodId, description) => {
  try {
    const paymentIntent = await createPaymentIntent(amount, currency, description);
    const confirmedPaymentIntent = await confirmPaymentIntent(paymentIntent.id, paymentMethodId);

    return {
      success: confirmedPaymentIntent.status === 'succeeded',
      paymentIntentId: confirmedPaymentIntent.id,
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return { success: false, error: error.message };
  }
};

// New function to handle refunds
const processRefund = async (paymentIntentId, amount, reason) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount,
      reason: reason
    });
    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error('Refund processing error:', error);
    return { success: false, error: error.message };
  }
};

// New function to generate invoices
const generateInvoice = async (customer, amount, description) => {
  try {
    const invoice = await stripe.invoices.create({
      customer: customer,
      auto_advance: true, // Auto-finalize the invoice
      collection_method: 'send_invoice',
      days_until_due: 30,
    });
    await stripe.invoiceItems.create({
      customer: customer,
      amount: amount,
      currency: 'usd',
      invoice: invoice.id,
      description: description,
    });
    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error('Invoice generation error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { 
  calculatePrice, 
  createPaymentIntent, 
  confirmPaymentIntent, 
  processPayment,
  processRefund,
  generateInvoice
};

*/