# Home Loan Amortization Portal

<img src="public/logo192.png" alt="App logo" width="120">

A small web application to calculate and visualize a home loan amortization schedule. The project contains:

- A primary React application (Create React App + CRACO) in the repository root with an amortization calculator, charting (Recharts), CSV export, and suggestion UI.
- Two example apps in subfolders:
  - `my-amortization-app` — Vue 3 + TypeScript + Vite example
  - `my-tailwind-app` — React + Vite + Tailwind example

Table of contents
- Quickstart
- Available scripts
- Features
- Usage (how to use the calculator)
- Project structure
- Running the sub-apps
- Development notes & troubleshooting
- Contributing
- License

## Quickstart

Requirements
- Node.js (recommended >= 16)
- npm (or yarn)

Install dependencies and start the root React app:
```bash
# from repository root
npm install
npm start
```

Open http://localhost:3000 in your browser.

Note: This project uses CRACO to integrate Tailwind/PostCSS with Create React App. If you change PostCSS/Tailwind files, restart the dev server.

## Available scripts (root)

From the repository root:

- `npm start` — start development server (CRACO -> react-scripts)
- `npm run build` — produce a production build
- `npm test` — run tests (CRACO wrapper)
- `npm run eject` — (CRA) eject config (irreversible action)

The root `package.json` uses CRACO and PostCSS/Tailwind (see `craco.config.js` and `postcss.config.js`).

## Features

- Monthly amortization calculation with:
  - Loan amount (principal)
  - Annual interest rate
  - Loan term (years)
  - Floating-rate support (single rate change after N years)
- Payment schedule table (per-period breakdown: principal, interest, remaining balance)
- Chart visualizing principal vs interest over time (Recharts)
- CSV download of the amortization schedule
- "Suggestions" panel — simple plan / tips calculated based on optional inputs (Annual salary / Extra monthly payment)
- Simple, easy-to-read UI and an approachable codebase for modification

## Usage — amortization calculator

1. Enter loan details:
   - Loan amount (principal)
   - Interest rate (annual percentage)
   - Loan term (in years)

2. Choose loan type:
   - Fixed Rate — interest rate is constant for the loan term.
   - Floating Rate — set the expected rate change (e.g., +0.5%) and the year after which the change applies.

3. Click "Calculate" (or equivalent button in the UI).

What you get:
- Payment per period (monthly amount)
- Total interest over the loan lifetime
- Chart: visual split of interest vs principal across periods
- Full table listing each payment's principal and interest components and remaining balance
- CSV download: Save the table locally for further analysis

Suggestions:
- Provide Annual Salary and Extra Monthly Payment to get suggested options to accelerate payoff.
- Suggestions are informational only — not professional financial advice.

## CSV export

The app generates CSV from the computed amortization schedule. Click the CSV/Download button to save the schedule to your computer for spreadsheet analysis.

## Project structure (important files)

- src/
  - App.js — main application logic and UI for the amortization calculator (calculations, chart, CSV export)
  - index.js — app entry point
  - App.css, index.css — styles used by the CRA app
- public/
  - index.html — base HTML template (includes Tailwind CDN for convenience)
  - logo192.png, logo512.png — icons used in README/manifest
- craco.config.js — config to load PostCSS/Tailwind into CRA
- postcss.config.js — PostCSS plugins (tailwindcss, autoprefixer)
- tailwind.config.js — tailwind configuration
- my-amortization-app/ — Vue 3 + Vite + TypeScript sample app
- my-tailwind-app/ — React + Vite + Tailwind sample app

## Running the sub-apps

Both example sub-apps are independent and have their own package.json files.

my-amortization-app (Vue + Vite)
```bash
cd my-amortization-app
npm install
npm run dev
# open the URL reported by Vite, typically http://localhost:5173
```

my-tailwind-app (React + Vite)
```bash
cd my-tailwind-app
npm install
npm run dev
# open the URL reported by Vite
```

## Development notes & troubleshooting

- CRACO + Tailwind (CRA compatibility)
  - The repository uses CRACO to integrate Tailwind into a CRA project. craco.config.js and postcss.config.js are present at the root.
  - If you change PostCSS or tailwind config, restart the dev server.

- Duplicate or altered package.json scripts:
  - The root package.json contains CRACO scripts. If you see unexpected script behavior, run `npm run` to list available scripts and confirm which one you need.

- If you encounter build or dependency errors:
  - Remove node_modules and lock file and reinstall:
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    ```
  - Ensure your Node version is compatible (>= 16 recommended).

- If charts do not render:
  - Verify `recharts` is installed (root package.json depends on `recharts`).
  - Ensure your browser supports modern JavaScript (React 18+).

## How the amortization calculation works (high level)

- Payments are assumed monthly.
- Rate per period is derived from annual rate divided by 12.
- Standard amortization formula is used to compute monthly payments when interest > 0:
  payment = (principal * ratePerPeriod) / (1 - (1 + ratePerPeriod)^(-totalPayments))
- For a floating rate option, when the schedule reaches the configured change year, the rate and payments are recalculated for the remaining balance and periods.

You can find the calculation and schedule building logic in `src/App.js` — look for the function that iterates over payment periods to construct the schedule.



