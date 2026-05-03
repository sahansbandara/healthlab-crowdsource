const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async ({ orderId, amount, currency = 'lkr', customerEmail, fundRequestId, itemName }) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: itemName,
                            description: `Contribution for ${itemName}`,
                        },
                        unit_amount: Math.round(amount * 100), // Stripe expects amounts in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-contributions?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/fund-requests?payment=cancelled`,
            customer_email: customerEmail,
            client_reference_id: orderId,
            metadata: {
                orderId,
                fundRequestId,
            },
        });

        return session;
    } catch (error) {
        throw error;
    }
};

const verifyWebhook = (body, signature) => {
    return stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
    );
};

module.exports = {
    createCheckoutSession,
    verifyWebhook,
    stripe
};
