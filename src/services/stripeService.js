const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw error;
  }
};

const createCheckoutSession = async (lineItems, successUrl, cancelUrl, metadata = {}) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    });
    
    return session;
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    throw error;
  }
};

const handleWebhookEvent = async (event) => {
  try {
    const OrderModel = require('../models/orderModel');
    const AnalyticsModel = require('../models/analyticsModel');
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        if (event.data.object.metadata && event.data.object.metadata.orderId) {
          const orderId = event.data.object.metadata.orderId;
          await OrderModel.update(orderId, { 
            status: 'paid',
            payment_id: event.data.object.id,
            payment_status: 'completed'
          });
          
          await AnalyticsModel.logEvent('payment_success', {
            orderId,
            amount: event.data.object.amount,
            paymentMethod: event.data.object.payment_method_types[0]
          });
        }
        return { 
          status: 'success', 
          event: event.type,
          orderId: event.data.object.metadata?.orderId
        };
        
      case 'payment_intent.payment_failed':
        if (event.data.object.metadata && event.data.object.metadata.orderId) {
          const orderId = event.data.object.metadata.orderId;
          await OrderModel.update(orderId, { 
            status: 'payment_failed',
            payment_id: event.data.object.id,
            payment_status: 'failed',
            payment_error: event.data.object.last_payment_error?.message
          });
          
          await AnalyticsModel.logEvent('payment_failed', {
            orderId,
            amount: event.data.object.amount,
            error: event.data.object.last_payment_error?.message
          });
        }
        return { 
          status: 'failed', 
          event: event.type,
          orderId: event.data.object.metadata?.orderId,
          error: event.data.object.last_payment_error?.message
        };
        
      case 'checkout.session.completed':
        if (event.data.object.metadata && event.data.object.metadata.orderId) {
          const orderId = event.data.object.metadata.orderId;
          await OrderModel.update(orderId, { 
            status: 'paid',
            payment_id: event.data.object.payment_intent,
            payment_status: 'completed'
          });
          
          await AnalyticsModel.logEvent('checkout_completed', {
            orderId,
            amount: event.data.object.amount_total,
            customer: event.data.object.customer
          });
        }
        return { 
          status: 'success', 
          event: event.type,
          orderId: event.data.object.metadata?.orderId
        };
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await AnalyticsModel.logEvent(event.type, {
          subscription: event.data.object.id,
          customer: event.data.object.customer,
          status: event.data.object.status
        });
        return { 
          status: 'success', 
          event: event.type,
          subscription: event.data.object.id
        };
        
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
        return { status: 'unhandled', event: event.type };
    }
  } catch (error) {
    console.error('Stripe webhook error:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  handleWebhookEvent
};
