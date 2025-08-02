import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// This is the main App component that renders the entire application.
const App = () => {
  // State variables for user inputs
  const [principal, setPrincipal] = useState(3000000);
  const [annualRate, setAnnualRate] = useState(7.0);
  const [years, setYears] = useState(20);
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [annualSalary, setAnnualSalary] = useState(''); // New state for user's annual salary
  const [additionalAffordability, setAdditionalAffordability] = useState(''); // New state for additional monthly payments
  const [suggestions, setSuggestions] = useState(''); // New state for LLM suggestions
  const [isLoading, setIsLoading] = useState(false); // New state for loading indicator
  
  // New state variables for floating rate functionality
  const [rateType, setRateType] = useState('fixed');
  const [floatingRateChange, setFloatingRateChange] = useState(0.5); // Example change of 0.5%
  const [floatingRateChangeYear, setFloatingRateChangeYear] = useState(5); // Change occurs after 5 years

  // State variable to store the calculated amortization schedule
  const [schedule, setSchedule] = useState([]);
  const [paymentPerPeriod, setPaymentPerPeriod] = useState(0);

  // useEffect hook to re-calculate the schedule whenever inputs change
  useEffect(() => {
    // Map payment frequency to the number of payments per year
    const paymentsPerYearMap = {
      'monthly': 12,
      '6months': 2,
      'yearly': 1,
      '3years': 1 / 3, // For tri-annual payments
      '5years': 1 / 5, // For quinary payments
    };

    const paymentsPerYear = paymentsPerYearMap[paymentFrequency];
    let ratePerPeriod = (annualRate / 100) / paymentsPerYear;
    const totalPayments = years * paymentsPerYear;

    let calculatedPayment = 0;
    
    // Initial payment calculation for the first period
    if (ratePerPeriod > 0) {
      calculatedPayment = (principal * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -totalPayments));
    } else {
      calculatedPayment = principal / totalPayments;
    }

    const newSchedule = [];
    let remainingBalance = principal;
    
    // The main loop for calculating the amortization schedule
    for (let i = 1; i <= totalPayments; i++) {
      // Logic for floating rate changes
      if (rateType === 'floating' && Math.ceil(i / paymentsPerYear) === floatingRateChangeYear + 1) {
        // Calculate the new rate and payment from the floating rate change year
        ratePerPeriod = ((annualRate + floatingRateChange) / 100) / paymentsPerYear;
        const remainingPayments = totalPayments - (floatingRateChangeYear * paymentsPerYear);
        if (remainingBalance > 0 && remainingPayments > 0 && ratePerPeriod > 0) {
            calculatedPayment = (remainingBalance * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -remainingPayments));
        } else if (remainingPayments > 0) {
            calculatedPayment = remainingBalance / remainingPayments;
        } else {
            calculatedPayment = remainingBalance;
        }
      }

      const interestPaid = remainingBalance * ratePerPeriod;
      let principalPaid = calculatedPayment - interestPaid;
      
      // Adjust the final payment to clear the loan completely
      if (i === totalPayments) {
        principalPaid = remainingBalance;
        calculatedPayment = principalPaid + interestPaid;
      }
      
      remainingBalance -= principalPaid;

      newSchedule.push({
        paymentNumber: i,
        beginningBalance: remainingBalance + principalPaid,
        paymentPerPeriod: calculatedPayment,
        principalPaid: principalPaid,
        interestPaid: interestPaid,
        remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
      });
    }

    setSchedule(newSchedule);
    setPaymentPerPeriod(newSchedule.length > 0 ? newSchedule[0].paymentPerPeriod : 0);
  }, [principal, annualRate, years, paymentFrequency, rateType, floatingRateChange, floatingRateChangeYear]);

  // Function to format numbers as currency
  const formatCurrency = (value) => {
    // Use 'en-IN' locale for Indian Rupee formatting
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };

  // Function to handle the download of the amortization schedule as a CSV file
  const handleDownload = () => {
    if (schedule.length === 0) {
      // Do nothing if there's no data to download
      return;
    }

    const headers = [
      "Payment #",
      "Beginning Balance",
      "Payment per Period",
      "Principal Paid",
      "Interest Paid",
      "Remaining Balance"
    ];

    let csvContent = headers.join(',') + '\n';
    
    schedule.forEach(item => {
      const row = [
        item.paymentNumber,
        item.beginningBalance.toFixed(2),
        item.paymentPerPeriod.toFixed(2),
        item.principalPaid.toFixed(2),
        item.interestPaid.toFixed(2),
        item.remainingBalance.toFixed(2)
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "home-loan-amortization-schedule.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getLoanSuggestions = async () => {
    if (!annualSalary || !additionalAffordability) {
      setSuggestions("Please fill in your salary and additional affordability to get suggestions.");
      return;
    }
    setIsLoading(true);
    setSuggestions('');

    try {
      let prompt = `Provide a simple, readable, and concise step-by-step plan for paying off a home loan sooner. Use a short, bulleted list. The plan should be based on the user's financial details and the loan terms provided. Be direct and avoid long explanations. Only include the final calculated values for the new total monthly payment, the new loan term, and the reduction in the loan term.
- Principal: ₹${principal}
- Annual Rate: ${annualRate}%
- Loan Term: ${years} years
- Payment Frequency: ${paymentFrequency}
- User's annual salary: ₹${annualSalary}
- User's additional monthly affordability: ₹${additionalAffordability}`;

      if (rateType === 'floating') {
        prompt += `\n- Loan Type: Floating Rate`;
        prompt += `\n- Floating Rate Change: ${floatingRateChange}% after ${floatingRateChangeYear} years`;
      } else {
        prompt += `\n- Loan Type: Fixed Rate`;
      }
      
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setSuggestions(text);
      } else {
        setSuggestions("Sorry, I could not generate suggestions. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions("Sorry, an error occurred while generating suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // The main container uses responsive padding and a new color palette for a home-themed design.
    <div className="bg-gray-100 dark:bg-gray-900 p-6 sm:p-8 md:p-12 min-h-screen font-sans relative">
      <div className="max-w-6xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
        <div className="text-center bg-gray-200 dark:bg-gray-700 p-6 border-b-4 border-teal-700 relative">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowHelpModal(true)}
              className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-2 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
              aria-label="Help and feedback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12" y2="17"></line>
              </svg>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 flex items-center justify-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Home Loan Amortization Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Calculate your home loan payments and visualize the amortization schedule. 
            Calculations are based on a fixed-rate and floating-rate methods.
          </p>
          <div className="mt-4 flex justify-center items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <a
              href="mailto:muthumaheshjothiramalingam@gmail.com"
              className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
            >
             Support/Dev contact: muthumaheshjothiramalingam@gmail.com
            </a>
          </div>
        </div>
        <div className="p-6 md:p-8 lg:p-10 grid gap-8">
          {/* Input Form Section */}
          <div className="grid md:grid-cols-4 gap-6">
             <div className="grid gap-2">
              <label htmlFor="rateType" className="text-sm font-medium text-gray-700 dark:text-gray-300">Loan Type</label>
              <select
                id="rateType"
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
                className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
              >
                <option value="fixed">Fixed Rate</option>
                <option value="floating">Floating Rate</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="principal" className="text-sm font-medium text-gray-700 dark:text-gray-300">Home Loan Amount (₹)</label>
              <input
                id="principal"
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                placeholder="3000000"
                className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="annualRate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Annual Interest Rate (%)</label>
              <input
                id="annualRate"
                type="number"
                step="0.01"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                placeholder="7.0"
                className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="years" className="text-sm font-medium text-gray-700 dark:text-gray-300">Loan Term (Years)</label>
              <input
                id="years"
                type="number"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                placeholder="20"
                className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
              />
            </div>
          </div>
          {rateType === 'floating' && (
            <div className="grid md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900 p-6 rounded-xl shadow-inner border border-gray-300 dark:border-gray-700">
              <div className="grid gap-2">
                <label htmlFor="floatingRateChange" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rate Change (%)
                </label>
                <input
                  id="floatingRateChange"
                  type="number"
                  step="0.01"
                  value={floatingRateChange}
                  onChange={(e) => setFloatingRateChange(Number(e.target.value))}
                  placeholder="0.5"
                  className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="floatingRateChangeYear" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rate Change after (Years)
                </label>
                <input
                  id="floatingRateChangeYear"
                  type="number"
                  value={floatingRateChangeYear}
                  onChange={(e) => setFloatingRateChangeYear(Number(e.target.value))}
                  placeholder="5"
                  className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
                />
              </div>
            </div>
          )}

          {/* Results Summary Section */}
          <div className="grid md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900 p-6 rounded-xl shadow-inner border border-gray-300 dark:border-gray-700">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Payment per Period</h3>
              <p className="text-4xl font-bold text-teal-700 mt-2">{formatCurrency(paymentPerPeriod)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">based on your selected frequency</p>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Total Interest Paid</h3>
              <p className="text-4xl font-bold text-red-600 mt-2">{formatCurrency(schedule.reduce((sum, item) => sum + item.interestPaid, 0))}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">over the life of the loan</p>
            </div>
          </div>

          {/* Chart Section */}
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-50 mb-4 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Payment Breakdown Chart
            </h2>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={schedule}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="paymentNumber"
                    label={{ value: 'Payment Number', position: 'insideBottom', offset: 0 }}
                  />
                  <YAxis tickFormatter={(tick) => `₹${(tick / 100000).toFixed(1)}L`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="principalPaid" stackId="a" stroke="#004d40" name="Principal Paid" />
                  <Line type="monotone" dataKey="interestPaid" stackId="b" stroke="#d32f2f" name="Interest Paid" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Schedule Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
                  <path d="M12 2h10" />
                  <path d="M12 12h10" />
                  <path d="M12 22h10" />
                  <path d="M2 2h10" />
                  <path d="M2 12h10" />
                  <path d="M2 22h10" />
                </svg>
                Full Amortization Schedule
              </h2>
              <button
                onClick={handleDownload}
                className="bg-teal-700 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-800 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={schedule.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download as CSV
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
              <table className="min-w-full">
                <thead className="bg-gray-200 dark:bg-gray-700">
                  <tr>
                    <th className="w-[100px] py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-300">Payment #</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-300">Beginning Balance</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-300">Payment</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-300">Principal Paid</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-300">Interest Paid</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-300">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <td className="font-medium py-3 px-4">{item.paymentNumber}</td>
                      <td className="py-3 px-4">{formatCurrency(item.beginningBalance)}</td>
                      <td className="py-3 px-4">{formatCurrency(item.paymentPerPeriod)}</td>
                      <td className="py-3 px-4">{formatCurrency(item.principalPaid)}</td>
                      <td className="py-3 px-4">{formatCurrency(item.interestPaid)}</td>
                      <td className={`py-3 px-4 ${item.remainingBalance === 0 ? 'text-green-600 font-bold' : ''}`}>
                        {formatCurrency(item.remainingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Suggestions Section */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-50 mb-4 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
                <path d="M12 2a10 10 0 0 1 7.27 17.27L12 22l-7.27-2.73A10 10 0 0 1 12 2z" />
                <path d="M12 18v-6" />
                <path d="M12 12l4-4" />
                <path d="M12 12l-4-4" />
                <path d="M12 12v-2" />
              </svg>
              Loan Prepayment Suggestions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
              Participation is voluntary, and individuals are expected to assess and accept any potential risks.
            </p>
            {/* Added a note about using an AI tool */}
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mb-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>Suggestions are generated by an AI tool.</span>
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="annualSalary" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Annual Salary (₹)
                </label>
                <input
                  id="annualSalary"
                  type="number"
                  value={annualSalary}
                  onChange={(e) => setAnnualSalary(Number(e.target.value))}
                  placeholder="e.g., 1000000"
                  className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="additionalAffordability" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Monthly Affordability (₹)
                </label>
                <input
                  id="additionalAffordability"
                  type="number"
                  value={additionalAffordability}
                  onChange={(e) => setAdditionalAffordability(Number(e.target.value))}
                  placeholder="e.g., 5000"
                  className="rounded-lg shadow-sm focus:ring-2 focus:ring-teal-700 focus:border-transparent border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 w-full"
                />
              </div>
            </div>
            <button
              onClick={getLoanSuggestions}
              className="mt-4 bg-teal-700 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-800 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full"
              disabled={isLoading || !annualSalary || !additionalAffordability}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" x2="12" y1="12" y2="18" />
                    <line x1="15" x2="9" y1="15" y2="15" />
                  </svg>
                  Get Suggestions
                </>
              )}
            </button>
            {suggestions && (
              <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm prose dark:prose-invert">
                {/* We use dangerouslySetInnerHTML to render the markdown content */}
                <div dangerouslySetInnerHTML={{ __html: suggestions }} />
              </div>
            )}
            {isLoading && !suggestions && (
                <div className="mt-6 flex justify-center text-gray-500 dark:text-gray-400">
                    Generating personalized suggestions...
                </div>
            )}
          </div>
        </div>
        <div className="p-6 md:p-8 lg:p-10 text-center bg-gray-200 dark:bg-gray-700 border-t-4 border-teal-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 w-full">
            Calculations are based on a fixed-rate and floating-rate .
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 w-full mt-2">
            © {new Date().getFullYear()} Muthumahesh. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        // The modal is positioned absolutely and uses flexbox to center its content, making it responsive by default.
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowHelpModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 relative"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing the modal
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Help</h2>
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="prose dark:prose-invert">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Website Discription</h3>
              <p className="text-gray-600 dark:text-gray-300">
                This Home Loan Amortization Schedule calculator helps you visualize and manage your loan payments. It calculates your payments based on the selected frequency and provides a detailed breakdown of your loan schedule.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Contact</h3>
              <p className="text-gray-600 dark:text-gray-300">
                For feedback, bug reports, or any other inquiries, please feel free to reach out.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <a
                    href="mailto:muthumaheshjothiramalingam@gmail.com"
                    className="text-gray-800 dark:text-gray-200 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  >
                    muthumaheshjothiramalingam@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  <a
                    href="https://www.linkedin.com/in/muthumahesh/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-800 dark:text-gray-200 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  >
                    My LinkedIn Profile
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
