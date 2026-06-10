export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    PAYME_TEST_MODE: process.env.PAYME_TEST_MODE || 'NOT_FOUND',
    PAYME_MERCHANT_ID: process.env.PAYME_MERCHANT_ID || 'NOT_FOUND',
    HAS_TEST_SECRET: !!process.env.PAYME_TEST_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV || 'NOT_FOUND',
    KEYS: Object.keys(process.env).filter(k => k.startsWith('PAYME_') || k.startsWith('VITE_') || k.startsWith('SUPABASE_'))
  });
}
