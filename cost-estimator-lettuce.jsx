// Simplified Cost Estimator for AI Agent Workload
import React, { useMemo, useState } from "react";

// --- Helper logic for simplified cost calculation ---
export function calculateSimplifiedCosts({
  ticketsPerMonth = 1000,
  missingPointsPercentage = 60,
  langChainSeats = 2,
}) {
  const missingPointsTickets = Math.round((missingPointsPercentage / 100) * ticketsPerMonth);
  const otherTickets = ticketsPerMonth - missingPointsTickets;
  
  // LangChain Plus seats
  const langChainCost = langChainSeats * 39;
  
  // Production uptime (24/7 @ $0.0036/min)
  const minutesPerMonth = 24 * 60 * 30; // 30 days
  const productionUptimeCost = minutesPerMonth * 0.0036;
  
  // Missing Points Tickets breakdown
  const missingPointsTicketResolution = missingPointsTickets * 0.02; // $0.02 per ticket
  const missingPointsLLMCalls = missingPointsTickets * 0.0003; // $0.0003 per ticket
  const missingPointsReceiptProcessing = missingPointsTickets * 0.004; // $0.004 per receipt
  const missingPointsSubtotal = missingPointsTicketResolution + missingPointsLLMCalls + missingPointsReceiptProcessing;
  
  // All Other Tickets breakdown
  const otherTicketsResolution = otherTickets * 0.005; // Average $0.005 per ticket (1-10 steps)
  const otherTicketsLLMCalls = otherTickets * 0.0003; // $0.0003 per ticket
  const otherTicketsSubtotal = otherTicketsResolution + otherTicketsLLMCalls;
  
  // Total monthly cost
  const totalMonthlyCost = langChainCost + productionUptimeCost + missingPointsSubtotal + otherTicketsSubtotal;
  
  return {
    ticketsPerMonth,
    missingPointsPercentage,
    missingPointsTickets,
    otherTickets,
    langChainSeats,
    langChainCost,
    productionUptimeCost,
    missingPointsTicketResolution,
    missingPointsLLMCalls,
    missingPointsReceiptProcessing,
    missingPointsSubtotal,
    otherTicketsResolution,
    otherTicketsLLMCalls,
    otherTicketsSubtotal,
    totalMonthlyCost,
  };
}

// --- React component (client-facing) ---
export default function SimplifiedCostEstimator() {
  const [ticketsPerMonth, setTicketsPerMonth] = useState(1000);
  const [missingPointsPercentage, setMissingPointsPercentage] = useState(60);
  const [langChainSeats, setLangChainSeats] = useState(2);

  const results = useMemo(
    () => calculateSimplifiedCosts({
      ticketsPerMonth,
      missingPointsPercentage,
      langChainSeats,
    }),
    [ticketsPerMonth, missingPointsPercentage, langChainSeats]
  );

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8">AI Agent Cost Calculator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Section: AI Agent Workload */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">AI Agent Workload</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-medium mb-2">
                Tickets per month: <span className="text-gray-900 font-bold">{ticketsPerMonth.toLocaleString()}</span>
              </label>
              <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100" 
                value={ticketsPerMonth} 
                onChange={(e) => setTicketsPerMonth(+e.target.value)}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>100</span>
                <span>5,000</span>
              </div>
            </div>
            
            <div>
              <label className="block text-lg font-medium mb-2">
                Missing points tickets: <span className="text-gray-900 font-bold">{missingPointsPercentage}%</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5" 
                value={missingPointsPercentage} 
                onChange={(e) => setMissingPointsPercentage(+e.target.value)}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Monthly Cost */}
        <div className="space-y-6">
          {/* <h2 className="text-2xl font-semibold text-gray-900">Monthly Cost</h2> */}
          
          <div className="flex justify-between items-center mb-6">
            <div className="text-2xl font-semibold text-gray-900">Monthly Cost</div>
            <div className="text-4xl font-bold text-black-600">
              ${results.totalMonthlyCost.toFixed(2)}
            </div>
          </div>
          
          <div>
            {/* LangChain Plus seats */}
            <div className="flex justify-between items-center">
              <div className="font-medium">LangChain Plus seats</div>
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  value={langChainSeats} 
                  onChange={(e) => setLangChainSeats(+e.target.value)}
                  className="w-16 px-2 py-1 border rounded text-center"
                />
                <span className="text-sm text-gray-500">seats</span>
                <div className="font-semibold ml-2">${results.langChainCost.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Seats for tracing and observability
            </div>
            
            {/* Production uptime */}
            <div className="flex justify-between items-center mt-4">
              <div className="font-medium">Production uptime</div>
              <div className="font-semibold">${results.productionUptimeCost.toFixed(2)}</div>
            </div>
            <div className="text-sm text-gray-600 mt-1 mb-8">
              Agent runs 24/7 @ $0.0036 / min
            </div>
            
                         {/* Missing Points Tickets */}
             <div className="border-l-4 border-blue-500 pl-4">
               <div className="flex justify-between items-center mb-2">
                 <div className="font-medium">Missing Points Tickets ({results.missingPointsTickets})</div>
                 <div className="font-semibold">${results.missingPointsSubtotal.toFixed(2)}</div>
               </div>
               
               <div className="space-y-3 ml-4">
                 <div>
                   <div className="flex justify-between items-center">
                     <span className="font-medium">Ticket resolution</span>
                     <div>${results.missingPointsTicketResolution.toFixed(2)}</div>
                   </div>
                   <div className="text-sm text-gray-600 mt-1 pr-16">
                     A full missing points agent workflow is about 20 steps (nodes) and costs $0.02 to run per ticket
                   </div>
                 </div>
                 
                 <div>
                   <div className="flex justify-between items-center">
                     <span className="font-medium">LLM calls + Receipt processing</span>
                     <div>${(results.missingPointsLLMCalls + results.missingPointsReceiptProcessing).toFixed(2)}</div>
                   </div>
                   <div className="text-sm text-gray-600 mt-1 pr-16  mb-4">
                     Reading a ticket costs ~$0.0003. Reading a receipt costs ~$0.004.
                   </div>
                 </div>
               </div>
             </div>
            
                         {/* All Other Tickets */}
             <div className="border-l-4 border-green-500 pl-4">
               <div className="flex justify-between items-center mb-2">
                 <div className="font-medium">All Other Tickets ({results.otherTickets})</div>
                 <div className="font-semibold">${results.otherTicketsSubtotal.toFixed(2)}</div>
               </div>
               
               <div className="space-y-3 ml-4">
                 <div>
                   <div className="flex justify-between items-center">
                     <span className="font-medium">Ticket resolution</span>
                     <div>${results.otherTicketsResolution.toFixed(2)}</div>
                   </div>
                   <div className="text-sm text-gray-600 mt-1 pr-16">
                     Non-missing points ticket workflows are between 1-10 steps, costing between $0.001 and $0.01 per ticket
                   </div>
                 </div>
                 
                 <div>
                   <div className="flex justify-between items-center">
                     <span className="font-medium">LLM calls</span>
                     <div>${results.otherTicketsLLMCalls.toFixed(2)}</div>
                   </div>
                   <div className="text-sm text-gray-600 mt-1 pr-16">
                     Reading a ticket costs ~$0.0003
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
