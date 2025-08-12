// LlmCostEstimatorWithBreakdown.jsx
import React, { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

/*
  Fix: Register required Chart.js components.
  Without registering CategoryScale (and other elements) Chart.js v3+ throws:
  "category" is not a registered scale.
*/
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Helper logic (exported for tests / external use) ---
export function calculateCosts({
  tickets = 1000,
  automationRate = 40,
  modelName = "Claude Sonnet 3.7 Vision",
  langsmithUsers = 1,
  buildCost = 75000,
  amortizationMonths = 12,
  manualCostPerTicket = 6, // default — please confirm
}) {
  const models = {
    "Claude Sonnet 3.7 Vision": {
      visionCost: 0.004,
      tokenCost: 0.000005,
      basePromptOutput: 0.002,
      tokensPerTicket: 2000,
    },
    "GPT-4o Vision": {
      visionCost: 0.005,
      tokenCost: 0.0000055,
      basePromptOutput: 0.0022,
      tokensPerTicket: 2000,
    },
    "Gemini 1.5 Pro Vision": {
      visionCost: 0.0035,
      tokenCost: 0.0000048,
      basePromptOutput: 0.002,
      tokensPerTicket: 2000,
    },
  };

  const m = models[modelName] || models["Claude Sonnet 3.7 Vision"];
  const automatedTickets = Math.round((automationRate / 100) * tickets);

  // Vision & text prompt costs
  const costVision = tickets * m.visionCost;
  const costText = tickets * (m.tokensPerTicket * m.tokenCost + m.basePromptOutput);

  // LangSmith / LangGraph licensing (LangSmith price used as example)
  const costLangSmith = langsmithUsers * 39;

  // Tracing / overage - 10k base traces included, $0.50 per extra 1k traces
  const extraTraces = Math.max(tickets - 10000, 0);
  const traceOverage = (extraTraces / 1000) * 0.5;

  const totalMonthlyLLM = costVision + costText + costLangSmith + traceOverage;

  // Amortize the one-time build cost across amortizationMonths for monthly projection
  const amortizedBuildMonthly = buildCost / Math.max(1, amortizationMonths);
  const agentMonthlyAllIn = totalMonthlyLLM + amortizedBuildMonthly;

  // Manual handling baseline
  const manualBaselineMonthly = tickets * manualCostPerTicket;
  const manualAfterAgentMonthly = (tickets - automatedTickets) * manualCostPerTicket;

  // Recurring net monthly savings (useful for payback calc) — exclude amortization:
  const recurringNetMonthlySavings = automatedTickets * manualCostPerTicket - totalMonthlyLLM;

  // Payback months (months to recoup the one-time build cost)
  const paybackMonths =
    recurringNetMonthlySavings > 0 ? Math.ceil(buildCost / recurringNetMonthlySavings) : Infinity;

  return {
    tickets,
    automationRate,
    automatedTickets,
    modelName,
    costVision,
    costText,
    costLangSmith,
    traceOverage,
    totalMonthlyLLM,
    amortizedBuildMonthly,
    agentMonthlyAllIn,
    manualBaselineMonthly,
    manualAfterAgentMonthly,
    recurringNetMonthlySavings,
    paybackMonths,
  };
}

// Quick "unit-like" checks (console assertions)
(function runSanityChecks() {
  const r = calculateCosts({ tickets: 1000, automationRate: 40, modelName: "Claude Sonnet 3.7 Vision", langsmithUsers: 1, buildCost: 75000, amortizationMonths: 12, manualCostPerTicket: 6 });
  // Expect roughly the same order of magnitude as earlier estimates (LLM monthly ~ $50-100)
  console.assert(r.totalMonthlyLLM > 0 && r.totalMonthlyLLM < 2000, "LLM monthly cost outside expected range", r.totalMonthlyLLM);
  console.assert(r.automatedTickets === 400, "automatedTickets should be 400 for 40% of 1000");
})();

// --- React component (client-facing) ---
export default function LlmCostEstimatorWithBreakdown() {
  const [tickets, setTickets] = useState(1000);
  const [automationRate, setAutomationRate] = useState(40);
  const [model, setModel] = useState("Claude Sonnet 3.7 Vision");
  const [langsmithUsers, setLangsmithUsers] = useState(1);
  const [buildCost, setBuildCost] = useState(75000);
  const [amortizationMonths, setAmortizationMonths] = useState(12);
  const [manualCostPerTicket, setManualCostPerTicket] = useState(6);

  const results = useMemo(
    () =>
      calculateCosts({
        tickets,
        automationRate,
        modelName: model,
        langsmithUsers,
        buildCost,
        amortizationMonths,
        manualCostPerTicket,
      }),
    [tickets, automationRate, model, langsmithUsers, buildCost, amortizationMonths, manualCostPerTicket]
  );

  // Prepare projection data (12 months)
  const months = Array.from({ length: 12 }, (_, i) => `M${i + 1}`);
  const cumulative = [];
  // Start with -buildCost at month 0 then accumulate recurringNetMonthlySavings
  let cum = -buildCost;
  for (let i = 0; i < 12; i++) {
    cum += results.recurringNetMonthlySavings;
    cumulative.push(Number(cum.toFixed(2)));
  }

  const barData = {
    labels: ["Manual (monthly)", "Agent + leftover manual (monthly)"],
    datasets: [
      {
        label: "USD",
        data: [results.manualBaselineMonthly, results.agentMonthlyAllIn + results.manualAfterAgentMonthly - results.manualBaselineMonthly + results.manualBaselineMonthly], // show absolute for easy comparison
        backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(54, 162, 235, 0.6)"],
      },
    ],
  };

  const lineData = {
    labels: months,
    datasets: [
      {
        label: "Cumulative net savings (includes initial build at M0)",
        data: cumulative,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-2">LLM Cost & ROI Estimator</h2>
      <p className="text-sm text-gray-600 mb-4">
        Interactive estimator for monthly LLM & agent costs, with friendly explanations and projections.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Tickets / month: <strong>{tickets}</strong></label>
          <input type="range" min="100" max="10000" step="50" value={tickets} onChange={(e) => setTickets(+e.target.value)} />

          <label className="block text-sm font-medium mt-2">Automation success: <strong>{automationRate}%</strong></label>
          <input type="range" min="0" max="100" step="5" value={automationRate} onChange={(e) => setAutomationRate(+e.target.value)} />

          <label className="block text-sm font-medium mt-2">LLM Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="border rounded p-2 w-full">
            <option>Claude Sonnet 3.7 Vision</option>
            <option>GPT-4o Vision</option>
            <option>Gemini 1.5 Pro Vision</option>
          </select>

          <label className="block text-sm font-medium mt-2">LangSmith / LangGraph seats: <strong>{langsmithUsers}</strong></label>
          <input type="range" min="1" max="10" step="1" value={langsmithUsers} onChange={(e) => setLangsmithUsers(+e.target.value)} />

          <label className="block text-sm font-medium mt-2">Avg manual cost per ticket (USD)</label>
          <input type="number" step="0.5" min="0" value={manualCostPerTicket} onChange={(e) => setManualCostPerTicket(Number(e.target.value))} className="border rounded p-2 w-full" />

          <label className="block text-sm font-medium mt-2">One-time build cost (USD)</label>
          <input type="number" step="100" min="0" value={buildCost} onChange={(e) => setBuildCost(Number(e.target.value))} className="border rounded p-2 w-full" />

          <label className="block text-sm font-medium mt-2">Amortize build over (months)</label>
          <input type="number" step="1" min="1" value={amortizationMonths} onChange={(e) => setAmortizationMonths(Number(e.target.value))} className="border rounded p-2 w-full" />
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Estimated Monthly Cost</h3>
          <p className="text-lg font-bold mb-3">${results.totalMonthlyLLM.toFixed(2)} <span className="text-sm text-gray-500"> (recurring LLM + licensing)</span></p>

          <ul className="text-sm text-gray-700 space-y-1 mb-3">
            <li><strong>Vision / Image processing:</strong> ${results.costVision.toFixed(2)} — cost to process images (receipts/photos) per month.</li>
            <li><strong>Text prompt usage:</strong> ${results.costText.toFixed(2)} — cost for LLM prompts & responses (triage + verification steps).</li>
            <li><strong>LangSmith / LangGraph licensing:</strong> ${results.costLangSmith.toFixed(2)} — seats for tracing/observability (example $39/seat).</li>
            <li><strong>Trace overage:</strong> ${results.traceOverage.toFixed(2)} — extra tracing if you exceed included quota.</li>
            <li><strong>Amortized build (monthly):</strong> ${results.amortizedBuildMonthly.toFixed(2)} — your one-time build spread across the chosen months.</li>
          </ul>

          <div className="text-sm">
            <p><strong>Automation enables:</strong> {results.automatedTickets} automated tickets / month (at {results.automationRate}%).</p>
            <p><strong>Manual tickets remaining:</strong> {tickets - results.automatedTickets}</p>
            <p><strong>Manual baseline cost:</strong> ${results.manualBaselineMonthly.toFixed(2)} / month</p>
            <p><strong>Agent + leftover manual (monthly):</strong> ${results.agentMonthlyAllIn.toFixed(2)} + ${results.manualAfterAgentMonthly.toFixed(2)} = ${(results.agentMonthlyAllIn + results.manualAfterAgentMonthly).toFixed(2)}</p>
            <p className="mt-2"><strong>Estimated recurring net monthly savings: </strong>${results.recurringNetMonthlySavings.toFixed(2)}</p>
            <p><strong>Payback months (recoup build):</strong> {isFinite(results.paybackMonths) ? `${results.paybackMonths} months` : "Never (negative or zero monthly net savings)"} </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border rounded">
          <h4 className="font-semibold mb-2">Monthly Cost Comparison</h4>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>

        <div className="p-4 bg-white border rounded">
          <h4 className="font-semibold mb-2">12‑Month Cumulative Savings</h4>
          <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: true } } }} />
          <p className="text-xs text-gray-500 mt-2">
            Chart shows cumulative net savings: starts at −build cost then adds monthly recurring savings (automations × manual saving − LLM recurring cost).
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold mb-2">Plain-language explanations</h4>
        <ul className="text-sm space-y-1">
          <li><strong>Vision / Image processing:</strong> This is what it costs to send receipt or photo images to a vision-capable LLM to extract totals or confirm transactions.</li>
          <li><strong>Text prompt usage:</strong> The cost of sending the ticket text (what happened, timestamps) to the LLM and receiving its response (triage, instructions).</li>
          <li><strong>LangSmith / LangGraph seats:</strong> Observability/tracing and the orchestration layer that helps run, monitor and debug the agent.</li>
          <li><strong>Trace overage:</strong> If you exceed the free tracing quota, this is the small extra fee for additional traces.</li>
          <li><strong>One-time build & amortization:</strong> We show your $75k build spread across months so you can see monthly 'all-in' vs recurring only.</li>
        </ul>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Note</strong>: I set the default manual handling cost to <strong>${manualCostPerTicket}</strong> per ticket and amortization to <strong>{amortizationMonths} months</strong>. Is that the number you'd like to use for the client's ROI? If not, tell me the expected manual cost per ticket and how many months you want to amortize the build over and I'll update defaults or make it sticky for export.</p>
      </div>
    </div>
  );
}
