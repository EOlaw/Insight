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
  
  // Calculate final price
  const finalPrice = basePrice * experienceMultiplier * timeOfDayMultiplier * dayOfWeekMultiplier * 
                     seasonalMultiplier * demandMultiplier * loyaltyDiscount * lastMinuteMultiplier;
  
  // Adjust for duration
  return (finalPrice / 60) * duration;
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

module.exports = { 
  calculatePrice, 
  createPaymentIntent, 
  confirmPaymentIntent, 
  processPayment 
};