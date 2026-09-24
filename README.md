# Property Cost Calculator

A Next.js web app that helps you find the **true cost** of a home — beyond the sticker price. It combines rent/EMI, hidden recurring costs (maintenance, parking, society charges, commute, furnishing, repairs), and one-time setup costs into a single "true monthly cost" figure, then helps you compare properties side by side and check affordability against your income.

Built with [v0](https://v0.app) and linked to the [v0 project](https://v0.app/chat/projects/prj_gRRdmdNnryDHKAPzIat2Mayq6MhY) — changes pushed from v0 land here, and merges to `main` auto-deploy.

## Features

- **Property comparison** — add multiple properties (rent or buy) and compare them side by side.
- **True cost breakdown** — surfaces hidden monthly costs (maintenance, parking, society charges, commute, furnishing amortization, repairs buffer) and one-time costs (stamp duty/registration, furniture, utility setup) on top of the base rent/EMI.
- **Lifestyle onboarding** — a short questionnaire (commute mode, distance to work, kids' schooling, parking needs, food delivery habits, household help) used to personalize cost estimates.
- **Affordability analysis** — checks a property's true cost against your income to flag "safe" vs. "stretch" ranges.
- **Custom properties** — add, toggle, and remove your own listings via a simple form.
- **Indian currency formatting** — values are formatted in the lakh/crore (₹) convention.
- **Sticky progress navigation** — a scroll-aware nav that tracks which section (Properties, Profile, Costs, Compare) you're in.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) components (Base UI primitives, `class-variance-authority`, `tailwind-merge`)
- [Recharts](https://recharts.org) / `d3-force` / `d3-hierarchy` for data visualization
- [Lucide](https://lucide.dev) icons
- [Vercel Analytics](https://vercel.com/analytics)

## Project Structure

```
app/                      Next.js app router entry (layout, page, global styles)
components/               Feature components (hero, comparison, cost breakdown,
                           affordability analysis, lifestyle onboarding, etc.)
components/ui/            Reusable shadcn/ui primitives (button, card, badge, input)
context/                  React context for tracking the active property
hooks/                    Custom hooks (count-up animation, in-view/section visibility)
lib/                      Utilities (Indian currency formatting, class-name helpers)
public/                   Static assets
```

## Getting Started

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

(`npm install && npm run dev` or `yarn && yarn dev` also work.)

Open [http://localhost:3000](http://localhost:3000) to see the app. Start editing from [app/page.tsx](app/page.tsx) — the page auto-updates as you edit.

## Available Scripts

| Command       | Description                       |
| ------------- | ---------------------------------- |
| `pnpm dev`    | Start the development server       |
| `pnpm build`  | Build the app for production       |
| `pnpm start`  | Start the production server        |
| `pnpm lint`   | Run ESLint                         |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [v0 Documentation](https://v0.app/docs)
