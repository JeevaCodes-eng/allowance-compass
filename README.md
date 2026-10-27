# PocketPilot — Student Money Planner

PocketPilot helps students who live on a fixed allowance make practical spending decisions before their money runs out.

## Problem statement
A student may know their current balance but still overspend because upcoming bills, remaining days, category limits, and their recent spending pace are not considered together.

## Target users
Students managing a monthly allowance or a limited personal budget.

## Solution and key workflows
1. **Record income and expenses:** add dated transactions with amount, category, and description; invalid amounts and unsupported future expenses are rejected.
2. **Reserve upcoming bills:** create future payments and reserve their value before calculating uncommitted funds. Marking a bill paid records an expense and removes it from the reserve to avoid counting it twice.
3. **Calculate safe-to-spend:** calculate a conservative daily amount from current balance after upcoming bills, divided across the remaining days of the month.
4. **Forecast month-end balance:** extrapolate the current month's daily spending pace and subtract unpaid upcoming bills to highlight a potential shortfall.
5. **Manage category budgets:** compare recorded category spending with monthly limits and flag overspending.
6. **Persist data locally:** transactions, bills, and budgets persist in browser localStorage across refreshes on the same browser.

## Tech stack
- React 18
- JavaScript
- CSS
- Browser localStorage
- Lucide React icons

## Architecture
The application is a client-side React single-page application. UI components and workflow handlers update a single validated state object. Derived metrics (category totals, reserved bills, safe-to-spend amount, and forecast) are calculated from that state rather than separately stored, reducing inconsistency. The state is serialized to localStorage after changes.

## Run locally
Requirements: Node.js and npm.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Create a production build with:

```bash
npm run build
```

## Data and limitations
- This is a planning tool, not a bank-connected account or financial advice.
- Data stays in localStorage on the current browser; there is no login, server, cloud sync, or cross-device backup.
- Clearing browser storage removes local data. Use demo data for evaluator walkthroughs.
- The initial data is illustrative sample data and should not be interpreted as a real user's finances.
- The month-end forecast is a simple pace-based estimate and may be inaccurate when future spending differs from recent spending.
- The safe-to-spend amount floors negative available funds to zero rather than recommending spending from a shortfall.

## Deployment
Deploy as a static React application using Vercel or Netlify. Build command: `npm run build`. Output directory: `build`.
