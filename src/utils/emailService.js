
const sendEmail = async (to, subject, body, from = 'noreply@canteen42.com') => {
  try {
    console.log(`Email sent to ${to} from ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    
    return {
      success: true,
      message: 'Email sent successfully (simulated)'
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

const emailTemplates = {
  orderConfirmation: (order) => {
    return {
      subject: `Order Confirmation #${order.id}`,
      body: `Thank you for your order! Your order #${order.id} has been received and is being processed.`
    };
  },
  
  orderShipped: (order) => {
    return {
      subject: `Order Shipped #${order.id}`,
      body: `Your order #${order.id} has been shipped and is on its way!`
    };
  },
  
  passwordReset: (user, resetLink) => {
    return {
      subject: 'Password Reset Request',
      body: `You requested a password reset. Click the following link to reset your password: ${resetLink}`
    };
  }
};

module.exports = {
  sendEmail,
  emailTemplates
};
