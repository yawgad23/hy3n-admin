/**
 * HY3N Hubtel Payment Service
 *
 * Handles automatic daily commission deduction via Hubtel Direct Receive Money API.
 *
 * API endpoint:
 *   POST https://rmp.hubtel.com/merchantaccount/merchants/{POS_SALES_NUMBER}/receive/mobilemoney
 *
 * Auth: Basic base64(API_ID:API_KEY)
 *
 * Credentials are supplied only as server environment variables. They are never
 * embedded in source code, browser bundles, logs, or Git history going forward.
 */

export interface HubtelChargeRequest {
  /** Driver's MoMo phone number (e.g. "0244123456") */
  customerMsisdn: string;
  /** Amount in GH₵ */
  amount: number;
  /** Driver's full name */
  customerName: string;
  /** Description shown on USSD prompt */
  description: string;
  /** Unique reference for idempotency (e.g. "hy3n-commission-{driverId}-{date}") */
  clientReference: string;
  /** MoMo network channel: "mtn-gh" | "vodafone-gh" | "tigo-gh" */
  channel: 'mtn-gh' | 'vodafone-gh' | 'tigo-gh';
}

export interface HubtelChargeResponse {
  success: boolean;
  /** Hubtel transaction reference */
  transactionId?: string;
  /** "pending" | "success" | "failed" */
  status?: string;
  message?: string;
  /** Raw response from Hubtel for debugging */
  raw?: any;
}

function hubtelConfiguration() {
  const posNumber = String(process.env.HUBTEL_POS_NUMBER || '').trim();
  const apiId = String(process.env.HUBTEL_API_ID || '').trim();
  const apiKey = String(process.env.HUBTEL_API_KEY || '').trim();
  if (!posNumber || !apiId || !apiKey) return null;
  return { posNumber, apiId, apiKey };
}

function getBasicAuth(apiId: string, apiKey: string): string {
  const credentials = `${apiId}:${apiKey}`;
  return 'Basic ' + Buffer.from(credentials).toString('base64');
}

/**
 * Initiate a direct MoMo charge via Hubtel.
 * The driver receives a USSD prompt on their phone to approve the payment.
 */
export async function chargeDriverCommission(req: HubtelChargeRequest): Promise<HubtelChargeResponse> {
  const config = hubtelConfiguration();
  if (!config) {
    return {
      success: false,
      status: 'failed',
      message: 'Hubtel Direct Receive Money is not configured on this server.',
    };
  }
  const url = `https://rmp.hubtel.com/merchantaccount/merchants/${config.posNumber}/receive/mobilemoney`;

  const body = {
    CustomerMsisdn: req.customerMsisdn,
    Amount: req.amount,
    CustomerName: req.customerName,
    Description: req.description,
    ClientReference: req.clientReference,
    Channel: req.channel,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getBasicAuth(config.apiId, config.apiKey),
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Common error codes from Hubtel:
      // 401 = bad credentials or missing "Receive Money" scope
      // 403 = IP not whitelisted
      // 400 = invalid phone number or channel
      const errorMsg = data?.Message || data?.message || `HTTP ${response.status}`;
      console.error('[Hubtel] Charge failed:', response.status, errorMsg, data);
      return {
        success: false,
        status: 'failed',
        message: errorMsg,
        raw: data,
      };
    }

    // Hubtel returns ResponseCode "0000" for success
    const isSuccess = data?.ResponseCode === '0000' || data?.Status === 'Success' || response.status === 200;
    const transactionId = data?.Data?.TransactionId || data?.TransactionId || data?.ClientReference;

    return {
      success: isSuccess,
      transactionId,
      status: isSuccess ? 'pending' : 'failed',
      message: data?.Message || data?.message || (isSuccess ? 'Charge initiated' : 'Charge failed'),
      raw: data,
    };
  } catch (err: any) {
    console.error('[Hubtel] Network error:', err?.message);
    return {
      success: false,
      status: 'failed',
      message: err?.message || 'Network error contacting Hubtel',
    };
  }
}

/**
 * Determine commission amount based on driver service type.
 */
export function getCommissionAmount(serviceType: string): number {
  const configured = Number(process.env.HUBTEL_DRIVER_FEE_AMOUNT);
  return Number.isFinite(configured) && configured > 0 ? configured : 50;
}

/**
 * Determine Hubtel channel from MoMo network name.
 */
export function getMomoChannel(network: string): 'mtn-gh' | 'vodafone-gh' | 'tigo-gh' {
  const lower = (network || '').toLowerCase();
  if (lower.includes('vodafone') || lower.includes('telecel')) return 'vodafone-gh';
  if (lower.includes('tigo') || lower.includes('airtel') || lower.includes('airteltigo') || lower.includes('at')) return 'tigo-gh';
  return 'mtn-gh'; // Default to MTN (most common in Ghana)
}

/**
 * Generate a unique idempotency reference for a driver's daily commission.
 * Format: hy3n-commission-{driverId}-{YYYY-MM-DD}
 */
export function getCommissionReference(driverId: string, date?: string): string {
  const d = date || new Date().toISOString().split('T')[0];
  return `hy3n-commission-${driverId}-${d}`;
}
