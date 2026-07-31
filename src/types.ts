export type JsonObject = Record<string, unknown>;
export type DependencyErrorContext = Record<string, unknown>;

export type QuotePriceRequest = { sku: string; quantity: number; customerTier: string };
export type QuotePriceResponse = { sku: string; quantity: number; unitPrice: number; totalPrice: number; currency: string };

export type UserNotification = {
  notificationId: string;
  requestId: string;
  title: string;
  body: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
};
