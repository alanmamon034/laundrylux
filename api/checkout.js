// LaundryLux — Whop Checkout API

const WHOP_API_KEY = 'apik_5MivInB9jDWFn_C4727877_C_f04f1c7f9facb97428aa69e97d85a2383d132a50964f4c69651f82d4395f02'; // ← paste your key here

// Product map — Whop purchase URLs per product ID
// To get a purchase URL: Whop Dashboard → Products → click product → "Share" or view the product page
// The purchase URL looks like: https://whop.com/checkout/plan_xxxxxxxxx
const PRODUCT_CHECKOUT_URLS = {
  1: 'https://whop.com/laundrylax/lg-washer-and-dryer/?planId=plan_', // we'll fill this below
};

// We'll use the Whop API to list plans for a product and get the purchase_url
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

    // Get the Whop product ID for this store product
    const whopProductId = WHOP_PRODUCT_MAP[productId];
    if (!whopProductId) {
      return res.status(400).json({ error: 'Product not found.' });
    }

    // Fetch plans for this product to get the purchase_url
    const plansRes = await fetch(`https://api.whop.com/api/v2/plans?product_id=${whopProductId}&expand[]=product`, {
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const rawText = await plansRes.text();
    console.log('Plans status:', plansRes.status);
    console.log('Plans response:', rawText);

    let plansData;
    try { plansData = JSON.parse(rawText); } catch(e) {
      return res.status(500).json({ error: rawText.slice(0, 500) });
    }

    if (!plansRes.ok) {
      return res.status(500).json({ error: rawText });
    }

    // Get first plan's purchase_url
    const plans = plansData.data || plansData;
    const plan = Array.isArray(plans) ? plans[0] : null;

    if (!plan || !plan.purchase_url) {
      return res.status(500).json({ error: 'No plan found for this product. Response: ' + rawText });
    }

    // Log customer details for order fulfillment
    console.log('ORDER:', {
      product: productName,
      customer: customerName,
      email: customerEmail,
      phone: customerPhone,
      address: deliveryAddress,
      plan_id: plan.id,
    });

    return res.status(200).json({
      success: true,
      checkout_url: plan.purchase_url,
      plan_id: plan.id,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
