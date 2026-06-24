// LaundryLux — Whop Checkout API

const WHOP_API_KEY = 'apik_Y5zaCQi0QkhfI_C4727877_C_38c497d77d59ce558830c51d35fa0b1e9aba8ddc6fe0a64be3af590323c93a'; // ← paste your key here

const WHOP_PRODUCT_MAP = {
  1: 'prod_jYBYrRcabsFEa', // LG Washer & Dryer
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { productId, productName, customerName, customerEmail, customerPhone, deliveryAddress } = req.body;

    if (!customerEmail || !customerName) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const whopProductId = WHOP_PRODUCT_MAP[productId];
    if (!whopProductId) {
      return res.status(400).json({ error: 'Product not found.' });
    }

    const plansRes = await fetch(`https://api.whop.com/api/v2/plans?product_id=${whopProductId}&expand[]=product`, {
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const plansData = await plansRes.json();

    if (!plansRes.ok) {
      return res.status(500).json({ error: JSON.stringify(plansData) });
    }

    const plan = plansData.data?.[0];

    if (!plan) {
      return res.status(500).json({ error: 'No plan found for this product.' });
    }

    // Use direct_link (Whop's checkout URL for this plan)
    const checkoutUrl = plan.purchase_url || plan.direct_link;

    if (!checkoutUrl) {
      return res.status(500).json({ error: 'No checkout URL found on plan.' });
    }

    // Log order details for fulfillment
    console.log('NEW ORDER:', {
      product: productName,
      customer: customerName,
      email: customerEmail,
      phone: customerPhone,
      address: deliveryAddress,
      plan_id: plan.id,
      amount: plan.initial_price,
    });

    return res.status(200).json({
      success: true,
      checkout_url: checkoutUrl + (checkoutUrl.includes("?") ? "&" : "?") + "currency=usd",
      plan_id: plan.id,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
