// LaundryLux — Whop Checkout API
// Vercel serverless function — runs on the server, API key never exposed to browser

const WHOP_API_KEY = 'apik_5MivInB9jDWFn_C4727877_C_f04f1c7f9facb97428aa69e97d85a2383d132a50964f4c69651f82d4395f02'; // ← paste your real key here
const WHOP_COMPANY_ID = 'biz_95atGN85BbmlGR'; // ← paste your biz_xxxxxxx here

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productName, productId, price, currency = 'usd', customerEmail, customerName, customerPhone } = req.body;

    if (!price || !customerEmail || !customerName) {
      return res.status(400).json({ error: 'Name, email and price are required.' });
    }

    // Step 1: Create a one-time plan for this product + price
    const planRes = await fetch('https://api.whop.com/api/v2/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        plan_type: 'one_time',
        initial_price: parseFloat(price),
        currency: currency.toLowerCase(),
        internal_notes: `${productName} | ${customerName} | ${customerPhone}`,
      }),
    });

    const plan = await planRes.json();
    if (!planRes.ok) {
      console.error('Plan error:', plan);
      return res.status(500).json({ error: plan.message || 'Could not create payment plan.' });
    }

    // Step 2: Create checkout session tied to that plan
    const origin = req.headers.origin || 'https://laundrylux.vercel.app';
    const checkoutRes = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: plan.id,
        email: customerEmail,
        metadata: {
          customer_name: customerName,
          customer_phone: customerPhone,
          product_id: productId,
          product_name: productName,
        },
        success_url: `${origin}/?payment=success&product=${encodeURIComponent(productName)}`,
        cancel_url: `${origin}/?payment=cancelled`,
      }),
    });

    const checkout = await checkoutRes.json();
    if (!checkoutRes.ok) {
      console.error('Checkout error:', checkout);
      return res.status(500).json({ error: checkout.message || 'Could not create checkout session.' });
    }

    return res.status(200).json({
      success: true,
      checkout_url: checkout.url || checkout.purchase_url,
      session_id: checkout.id,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Unexpected server error. Please try again.' });
  }
}
