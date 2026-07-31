import { randomUUID } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { JsonObject, QuotePriceRequest, QuotePriceResponse } from './types';

const config = {
  host: process.env.BFF_HOST || '0.0.0.0',
  port: Number.parseInt(process.env.BFF_PORT || '4000', 10),
  pricingServiceBaseUrl: process.env.PRICING_SERVICE_BASE_URL || 'http://localhost:5104'
};

const orders = new Map<string, JsonObject>();

async function quotePrice(request: QuotePriceRequest): Promise<QuotePriceResponse> {
  const response = await fetch(`${config.pricingServiceBaseUrl}/quote-price`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Pricing service returned ${response.status}`);
  }

  return response.json() as Promise<QuotePriceResponse>;
}

const app = express();
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  console.log(`[incoming-request] id=${requestId} method=${req.method} path=${req.originalUrl}`);
  res.on('finish', () => {
    console.log(`[request-complete] id=${requestId} method=${req.method} path=${req.originalUrl} status=${res.statusCode} durationMs=${Date.now() - startedAt}`);
  });
  next();
});

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.get('/customers/:id', (req, res) => {
  res.json({ id: req.params.id, email: `${req.params.id}@example.com`, tier: 'STANDARD' });
});

app.get('/catalog/items', (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const category = typeof req.query.category === 'string' ? req.query.category : 'general';
  res.json(Array.from({ length: limit }, (_, index) => ({
    sku: `${category}-${index + 1}`,
    name: `Demo ${category} item ${index + 1}`,
    available: true,
    listPrice: 10 + index
  })));
});

app.get('/catalog/items/:sku', (req, res) => {
  res.json({ sku: req.params.sku, name: `Demo item ${req.params.sku}`, available: true, listPrice: 10 });
});

app.get('/orders/:id', (req, res) => {
  res.json(orders.get(req.params.id) || { id: req.params.id, status: 'CONFIRMED' });
});

app.get('/orders', (req, res) => {
  const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : 'demo-customer';
  res.json([...orders.values()].filter((order) => order.customerId === customerId));
});

app.get('/quote-price', async (req, res, next) => {
  try {
    const quote = await quotePrice({ sku: String(req.query.sku), quantity: Number(req.query.quantity), customerTier: 'STANDARD' });
    res.json({ sku: quote.sku, quantity: quote.quantity, unitPrice: quote.unitPrice, totalPrice: quote.totalPrice });
  } catch (error) {
    next(error);
  }
});

app.post('/orders', async (req, res, next) => {
  try {
    const input = req.body as { customerId: string; sku: string; quantity: number; paymentMethodId: string };
    const quote = await quotePrice({ sku: input.sku, quantity: input.quantity, customerTier: 'STANDARD' });
    const order = { id: randomUUID(), customerId: input.customerId, status: 'CONFIRMED', items: [{ sku: input.sku, quantity: input.quantity, unitPrice: quote.unitPrice }], paymentMethodId: input.paymentMethodId };
    orders.set(order.id, order);
    res.json({ orderId: order.id, status: order.status });
  } catch (error) {
    next(error);
  }
});

app.post('/orders/:orderId/cancel', (req, res) => {
  const order = orders.get(req.params.orderId) || { id: req.params.orderId };
  order.status = 'CANCELLED';
  orders.set(req.params.orderId, order);
  res.json({ orderId: req.params.orderId, status: 'CANCELLED' });
});

app.post('/payments/:paymentId/refund', (req, res) => {
  res.json({ paymentId: req.params.paymentId, refundId: randomUUID(), status: 'REFUNDED', refundedAmount: req.body.amount });
});

app.post('/returns', (req, res) => {
  res.json({ returnId: randomUUID(), status: 'PENDING_REVIEW', updatedAt: new Date().toISOString(), refundAmount: null });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : String(error);
  res.status(502).json({ error: message });
});

const server = app.listen(config.port, config.host, () => console.log(`web-bff-api listening on http://${config.host}:${config.port}`));
function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
