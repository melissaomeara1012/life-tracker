This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Life Tracker

A modern, beautiful web app for tracking your life's important metrics:
- 💰 **Finance Tracker**: Track weekly savings, credit cards, and net worth
- 🧹 **Chores Tracker**: Keep your home organized with a household chores tracking system
- 💵 **Loan Tracker**: Monitor loan payments with amortization schedule and progress tracking

Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

### Finance Tracker
- Track weekly financial snapshots
- Visualize savings, credit card debt, and net worth trends
- Beautiful charts with historical data

### Chores Tracker
- Track household chores by area (Kitchen, Dining, Living, Bathrooms, Bedrooms)
- Organize tasks (Mop, Vacuum, Counters, Baseboards, Cabinets)
- See when each area was last cleaned
- Color-coded status indicators (green = recent, yellow = due soon, red = overdue)
- Complete history of all cleaning activities

### Loan Tracker
- Monitor O'Meara loan ($22,000 at 5% APR, bi-weekly payments)
- Summary dashboard with remaining balance, interest paid, and payoff estimate
- Interactive payment checklist for upcoming scheduled payments
- Detailed payment history with interest/principal breakdown
- Visual charts showing balance over time and cumulative interest
- Automatic amortization schedule calculation

## Database Setup

### Setting up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API
3. Create a `.env.local` file in the project root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running Database Migrations

To enable all features, run the SQL migrations:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following migrations in order:
   - `supabase_migrations/create_chore_completions.sql` - For Chores Tracker
   - `supabase_migrations/create_loan_payments.sql` - For Loan Tracker

This will create the necessary tables with proper indexes and security policies.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
