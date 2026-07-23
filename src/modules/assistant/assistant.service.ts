// import { SystemAction, SystemModule } from "../../generated/prisma/index.js";
// import prisma from "../../shared/utils/prisma.js";
// import { ActivityLogService } from "../activityLog/activityLog.service.js";
// import { DashboardService } from "../dashboard/dashboard.service.js";
// import type { AskAssistantInput } from "./assistant.validation.js";

// const queryGroq = async (messages: Array<{ role: string; content: string }>) => {
//   const apiKey = process.env.GROQ_API_KEY;
//   if (!apiKey) {
//     throw new Error("GROQ_API_KEY is not configured in environment variables");
//   }

//   const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${apiKey}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "llama-3.1-8b-instant",
//       messages,
//       temperature: 0.2,
//       max_tokens: 1200,
//     }),
//   });

//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData?.error?.message || `Groq API Error: ${response.statusText}`);
//   }

//   const result = await response.json();
//   return result.choices[0]?.message?.content || "";
// };

// const compileBusinessContext = async (accountId: string) => {
//   const account = await prisma.account.findUnique({
//     where: { id: accountId },
//     select: { companyName: true, category: true, type: true, currency: true },
//   });

//   const currency = account?.currency || "USD";

//   const [stats, lowStockData, productRankings, dueRankings, topCustomers] = await Promise.all([
//     DashboardService.getOverviewStats(accountId, "month").catch(() => null),
//     DashboardService.getLowStockAlert(accountId).catch(() => ({ products: [], rawProducts: [] })),
//     DashboardService.getProductRanking(accountId, "month").catch(() => ({
//       products: [],
//       preparedProducts: [],
//     })),
//     DashboardService.getDueRanking(accountId, "all").catch(() => []),
//     DashboardService.getTopCustomers(accountId, "month").catch(() => []),
//   ]);

//   const lowStockProductsSummary =
//     lowStockData.products.length > 0
//       ? lowStockData.products
//           .slice(0, 8)
//           .map(
//             (p) =>
//               `- ${p.name} (SKU: ${p.sku || "N/A"}): Current Stock ${p.currentStock} ${p.unit || ""}, Alert Level: ${p.threshold}`,
//           )
//           .join("\n")
//       : "No standard products are currently below their low stock thresholds.";

//   const lowStockRawSummary =
//     lowStockData.rawProducts.length > 0
//       ? lowStockData.rawProducts
//           .slice(0, 8)
//           .map(
//             (rp) =>
//               `- Raw Material: ${rp.name}: Current Stock ${rp.currentStock} ${rp.unit || ""}, Alert Level: ${rp.threshold}`,
//           )
//           .join("\n")
//       : "No raw materials are currently below their thresholds.";

//   const topProductsSummary =
//     productRankings.products.length > 0
//       ? productRankings.products
//           .slice(0, 5)
//           .map(
//             (p) =>
//               `- ${p.name} (SKU: ${p.sku || "N/A"}): Sold Qty ${p.quantity}, Generated Revenue: ${p.revenue} ${currency}`,
//           )
//           .join("\n")
//       : "No product sales records this month.";

//   const topPreparedSummary =
//     productRankings.preparedProducts.length > 0
//       ? productRankings.preparedProducts
//           .slice(0, 5)
//           .map(
//             (p) =>
//               `- Prepared Product: ${p.name}: Sold Qty ${p.quantity}, Revenue: ${p.revenue} ${currency}`,
//           )
//           .join("\n")
//       : "";

//   const outstandingDuesSummary =
//     dueRankings.length > 0
//       ? dueRankings
//           .slice(0, 5)
//           .map(
//             (d) =>
//               `- ${d.name} (${d.phone || "No phone"}): Total Outstanding Due: ${d.totalDue} ${currency}`,
//           )
//           .join("\n")
//       : "No active accounts receivable / unpaid dues.";

//   const topCustomersSummary =
//     topCustomers.length > 0
//       ? topCustomers
//           .slice(0, 5)
//           .map(
//             (c) => `- ${c.name}: ${c.salesCount} purchases, spent ${c.totalPurchase} ${currency}`,
//           )
//           .join("\n")
//       : "No client transaction logs yet.";

//   return `
// You are the dedicated AI Personal Business Assistant for the organization "${account?.companyName || "Our Business"}".
// You have direct, real-time database access. Avoid generic suggestions or vague instructions. Reference specific products, customer names, and dollar values.

// Current Business Type: ${account?.type || "N/A"} (${account?.category || "N/A"})
// Global Currency: ${currency}

// =========================================
// CURRENT PERIOD BUSINESS OVERVIEW STATS (THIS MONTH)
// =========================================
// - Total Revenue Generated: ${stats?.totalRevenue ?? 0} ${currency} (Change: ${stats?.revenueChangePercent ?? 0}%)
// - Profit Margin: ${stats?.profitMargin ?? 0}%
// - Total Profit Earned: ${stats?.totalProfit ?? 0} ${currency}
// - Total Sales Count: ${stats?.salesCount ?? 0} invoices (Change: ${stats?.salesCountChangePercent ?? 0}%)
// - Average Order Value: ${stats?.avgOrderValue ?? 0} ${currency}
// - Total Active Customers (This Period): ${stats?.activeCustomers ?? 0} (Total Registered All-Time: ${stats?.totalCustomers ?? 0})
// - Global Outstanding Dues: ${stats?.outstandingDues ?? 0} ${currency}

// =========================================
// LIVE SYSTEM ALERTS & DEEPER DATA SNAPSHOTS
// =========================================

// 1. CRITICAL LOW STOCK WARNINGS (Standard Products):
// ${lowStockProductsSummary}

// 2. CRITICAL LOW STOCK WARNINGS (Raw Ingredients/Materials):
// ${lowStockRawSummary}

// 3. TOP SELLING PRODUCTS BY REVENUE:
// ${topProductsSummary}
// ${topPreparedSummary ? `\nTop Prepared Kitchen/Production Items:\n${topPreparedSummary}` : ""}

// 4. TOP ACCOUNTS RECEIVABLE / CUSTOMER DUES RANKING:
// ${outstandingDuesSummary}

// 5. VIP CUSTOMERS OF THE MONTH:
// ${topCustomersSummary}

// Use this concrete, structured metadata to answer questions directly. If asked about inventory issues, list the low-stock items by their real names and specify their current levels. If asked about revenue or financial status, use the stats variables above. Keep responses professional, direct, and action-oriented.
//   `;
// };

// const askAssistant = async (
//   accountId: string,
//   userId: string,
//   payload: AskAssistantInput,
// ): Promise<string> => {
//   const { message, history } = payload;

//   const dynamicContext = await compileBusinessContext(accountId);

//   const messages = [
//     { role: "system", content: dynamicContext },
//     ...history,
//     { role: "user", content: message },
//   ];

//   const responseText = await queryGroq(messages);

//   await ActivityLogService.createLog({
//     userId,
//     module: SystemModule.ACTIVITY_LOG,
//     action: SystemAction.READ,
//     details: `Consulted Business Assistant AI on custom dashboard context`,
//     accountId,
//   });

//   return responseText;
// };

// export const AssistantService = {
//   askAssistant,
// };

import { SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import type { AskAssistantInput } from "./assistant.validation.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type ToolHandler = (toolCall: ToolCall) => Promise<unknown>;

const queryGroqWithTools = async (
  messages: Array<{ role: string; content: string }>,
  tools: unknown[],
  toolHandler: ToolHandler,
  retryCount = 0,
): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData?.error?.message?.includes("Rate limit") && retryCount < 3) {
        await sleep(8000 * (retryCount + 1));
        return queryGroqWithTools(messages, tools, toolHandler, retryCount + 1);
      }
      throw new Error(errorData?.error?.message || `Groq Error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices[0]?.message;

    if (message?.tool_calls?.length > 0) {
      const toolCall = message.tool_calls[0] as ToolCall;
      const toolResult = await toolHandler(toolCall);

      messages.push(message);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(toolResult),
      });

      return queryGroqWithTools(messages, tools, toolHandler, 0);
    }

    return message?.content || "No response generated.";
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    if (err.name === "AbortError" && retryCount < 2) {
      return queryGroqWithTools(messages, tools, toolHandler, retryCount + 1);
    }
    if (err.message?.includes("Rate limit") && retryCount < 3) {
      await sleep(7000);
      return queryGroqWithTools(messages, tools, toolHandler, retryCount + 1);
    }
    throw error;
  }
};

const getBusinessSummary = async (accountId: string) => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { companyName: true, currency: true },
  });

  const [stats, lowStock] = await Promise.all([
    DashboardService.getOverviewStats(accountId, "month").catch(() => ({})),
    DashboardService.getLowStockAlert(accountId).catch(() => ({ products: [], rawProducts: [] })),
  ]);

  return {
    companyName: account?.companyName,
    currency: account?.currency || "USD",
    stats,
    lowStock,
  };
};

const getProductDetails = async (accountId: string, filters: { productId?: string; sku?: string; name?: string }) => {
  const product = await prisma.product.findFirst({
    where: {
      accountId,
      OR: [
        { id: filters.productId },
        { sku: filters.sku },
        { name: { contains: filters.name || "", mode: "insensitive" } },
      ],
    },
    include: { productStocks: true, unit: true },
  });

  if (!product) return { error: "Product not found" };

  const stock = product.productStocks.reduce((sum, s) => sum + Number(s.quantity), 0);

  return {
    name: product.name,
    sku: product.sku,
    currentStock: stock,
    unit: product.unit.symbol,
  };
};

const tools = [
  {
    type: "function",
    function: {
      name: "get_business_summary",
      description: "Get current business overview and low stock",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get details of a specific product",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          sku: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  },
];

const askAssistant = async (
  accountId: string,
  userId: string,
  payload: AskAssistantInput,
): Promise<string> => {
  const { message, history = [] } = payload;

  const systemPrompt = `You are a helpful business assistant. Use tools when needed to get real data. Be direct and specific.`;

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  const responseText = await queryGroqWithTools(messages, tools, async (toolCall: ToolCall) => {
    const { name } = toolCall.function;
    const args = JSON.parse(toolCall.function.arguments || "{}");

    if (name === "get_business_summary") return await getBusinessSummary(accountId);
    if (name === "get_product_details") return await getProductDetails(accountId, args);
    return { error: "Unknown tool" };
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.ACTIVITY_LOG,
    action: SystemAction.READ,
    details: "Consulted Business Assistant AI",
    accountId,
  });

  return responseText;
};

export const AssistantService = { askAssistant };