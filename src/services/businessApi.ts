import type {
  QuoteRequest,
  QuoteRequestInput,
} from "@/types/service";
import { ApiError } from "@/types/product";
import { readJSON, writeJSON } from "@/lib/localStore";

/**
 * Commercial (B2B) API.
 * The quote request is stored locally so the demo shows a realistic
 * confirmation flow; nothing is transmitted to a server.
 */

const RFQ_KEY = "rewaa_quote_requests";

function delay(ms = 700): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextReference(existing: QuoteRequest[]): string {
  const year = new Date().getFullYear();
  const sequence = String(1000 + existing.length + 1).slice(-5);
  return `RWA-RFQ-${year}-${sequence}`;
}

export const businessApi = {
  /** POST /v1/commercial/quotes */
  async createQuoteRequest(input: QuoteRequestInput): Promise<QuoteRequest> {
    await delay(900);
    if (!input.company.trim() || !input.contactPerson.trim() || !input.phone.trim()) {
      throw new ApiError("يرجى إكمال بيانات المنشأة وجهة الاتصال", "VALIDATION", 422);
    }

    const existing = readJSON<QuoteRequest[]>(RFQ_KEY, []);
    const request: QuoteRequest = {
      id: `rfq_${Date.now()}`,
      reference: nextReference(existing),
      createdAt: new Date().toISOString(),
      expectedResponseHours: 24,
      cityName: input.cityName,
      industry: input.industry,
    };
    writeJSON(RFQ_KEY, [request, ...existing].slice(0, 50));
    return request;
  },

  /** GET /v1/commercial/quotes */
  async listQuoteRequests(): Promise<QuoteRequest[]> {
    await delay(220);
    return readJSON<QuoteRequest[]>(RFQ_KEY, []);
  },
};
