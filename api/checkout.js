// LaundryLux — Whop Checkout API

const WHOP_API_KEY = 'apik_5MivInB9jDWFn_C4727877_C_f04f1c7f9facb97428aa69e97d85a2383d132a50964f4c69651f82d4395f02';   // ← paste your key here
const WHOP_COMPANY_ID = 'prod_jYBYrRcabsFEa';  // ← paste your biz_xxxxxxx here

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      productName, productId, price,
      customerEmail, customerName, customerPhone, deliveryAddress
    } = req.body;

    if (!price || !customerEmail || !customerName) {
      return res.status(400).json({ error: 'Name, email and price are required.' });
    }

    const origin = req.headers.origin || 'https://laundrylux.vercel.app';

    const whopRes = await fetch('https://api.whop.com/api/v2/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        plan: {
          initial_price: parseFloat(price),
          plan_type: 'one_time',
          currency: 'usd',
        },
        redirect_url: `${origin}/?payment=success&product=${encodeURIComponent(productName)}`,
        metadata: {
          product_id: String(productId),
          product_name: productName,
          customer_name: customerName,
          customer_phone: customerPhone || '',
          delivery_address: deliveryAddress || '',
          customer_email: customerEmail,
        },
      }),
    });

    // Get raw text first so we can log it if JSON parse fails
    const rawText = await whopRes.text();
    console.log('Whop response status:', whopRes.status);
    console.log('Whop raw response:', rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({ error: `Whop returned invalid response: ${rawText.slice(0, 200)}` });
    }

    if (!whopRes.ok) {
      // Extract the most useful error message from Whop's response
      const errMsg =
        data?.message ||
        data?.error ||
        data?.errors?.[0]?.message ||
        data?.detail ||
        JSON.stringify(data);
      console.error('Whop error:', errMsg);
      return res.status(500).json({ error: `Whop: ${errMsg}` });
    }

    const checkoutUrl = data.purchase_url || `https://whop.com/checkout/${data.plan?.id}`;

    if (!checkoutUrl) {
      return res.status(500).json({ error: 'No checkout URL returned by Whop. Response: ' + JSON.stringify(data) });
    }

    return res.status(200).json({
      success: true,
      checkout_url: checkoutUrl,
      session_id: data.id,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
