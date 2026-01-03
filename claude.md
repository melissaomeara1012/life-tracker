# Life Tracker - Weekly Money Tracker

## Project Overview

Life Tracker is a Next.js web application for tracking weekly financial snapshots. Users can record checking account balances, savings balances, and credit card debt over time, with visualizations showing trends and net worth calculations.

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19.2.3
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts 3.6.0
- **Fonts**: Geist Sans & Geist Mono

## Project Structure

```
life-tracker/
├── app/
│   ├── layout.tsx         # Root layout with font configuration
│   ├── page.tsx           # Main application page (Weekly Money Tracker)
│   ├── globals.css        # Global Tailwind styles
│   └── favicon.ico
├── lib/
│   └── supabaseClient.ts  # Supabase client configuration
├── public/                # Static assets
├── package.json
├── tsconfig.json
├── next.config.ts
└── eslint.config.mjs
```

## Core Features

### 1. Financial Snapshot Entry
- Date picker for selecting week
- Input fields for:
  - Checking account balance
  - Savings account balance
  - Credit card balance
- Optional notes field
- Data stored in cents (converted from dollar input)

### 2. Data Visualization
- Line chart showing trends over time for:
  - Checking balance
  - Savings balance
  - Credit card balance
  - Net worth (checking + savings - credit card)
- Responsive chart using Recharts library

### 3. Historical Data Management
- List view of all snapshots (newest first)
- Shows week and calculated net worth
- Delete functionality for individual entries

## Database Schema

### `snapshots` Table
- `id`: string (primary key)
- `week_of`: string (ISO date format)
- `checking_cents`: number (stored in cents)
- `savings_cents`: number (stored in cents)
- `credit_card_cents`: number (stored in cents)
- `notes`: string | null

## Key Implementation Details

### Currency Handling
- All monetary values stored in cents to avoid floating-point precision issues
- Helper functions:
  - `dollarsToCents(v: string)`: Converts user input to cents
  - `centsToDollars(c: number)`: Formats cents as dollar string with 2 decimals

### Data Operations
- **Load**: Fetches all snapshots ordered by week_of ascending
- **Upsert**: Inserts new snapshot or updates existing one for the same week
- **Delete**: Removes snapshot with confirmation dialog

### State Management
- React hooks for local state (useState, useEffect, useMemo)
- No external state management library
- Client-side component ("use client" directive)

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Commands

```bash
npm run dev      # Start development server on localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Styling Approach

- Tailwind CSS for all styling
- Mobile-first responsive design
- Max-width container (max-w-md) for optimal mobile experience
- Clean, minimal UI with white cards on gray background
- Form inputs with consistent border/padding styling

## Future Enhancement Opportunities

- User authentication
- Multiple account types (investment accounts, loans, etc.)
- Budget tracking and goal setting
- Export data to CSV/Excel
- Recurring income/expense tracking
- Category-based spending analysis
- Month/year comparison views
- Email/notification reminders for weekly entries
