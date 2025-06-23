# Ethos Review Analyzer

A web application built with Fresh (Deno) to analyze user review patterns and "Review 4 Review" relationships on the Ethos platform.

## Features

- **Profile Search**: Search for Ethos users by username or profile URL with real-time typeahead
- **Review Analysis**: Complete analysis of user review patterns using Ethos API v2
- **Review Pairing**: Smart pairing of given and received reviews between users
- **Review 4 Review Detection**: Identify and highlight mutual review relationships with visual indicators
- **Statistics Dashboard**: Overview of reviews given, received, and reciprocal relationships
- **Real-time Data**: Live data from Ethos network via official APIs

## Tech Stack

- **Framework**: Fresh (Deno's full-stack web framework)
- **Runtime**: Deno
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Deno Deploy (ready)

## Getting Started

### Prerequisites

- Deno installed on your system

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ethos-timefun-1
   ```

2. Start the development server:
   ```bash
   deno task start
   ```

3. Open your browser and navigate to `http://localhost:8000`

## Development

- `deno task start` - Start the development server with hot reload
- `deno task build` - Build the project for production
- `deno task preview` - Preview the production build
- `deno task manifest` - Regenerate the Fresh manifest

## Project Structure

```
├── routes/           # Page routes
│   ├── index.tsx     # Homepage with search interface
│   └── api/          # API endpoints
│       ├── ethos-search.ts              # Ethos profile search
│       ├── ethos-activities-given.ts    # Reviews given by user
│       └── ethos-activities-received.ts # Reviews received by user
├── islands/          # Interactive components (client-side)
│   ├── SearchBar.tsx      # Search functionality with typeahead
│   └── ReviewAnalysis.tsx # Review analysis and pairing
├── components/       # Reusable components
│   └── Button.tsx    # Styled button component
├── static/           # Static assets
└── fresh.gen.ts      # Generated manifest (auto-updated)
```

## Roadmap

- [x] Basic search interface
- [x] Ethos API integration with typeahead search
- [x] User profile data fetching with avatars and scores
- [x] Review analysis with Ethos API v2 Activity endpoints
- [x] "Review 4 Review" pattern detection and pairing
- [x] Statistics dashboard (given, received, reciprocal reviews)
- [ ] Review content analysis and sentiment
- [ ] Relationship graph visualization
- [ ] Export functionality

## Contributing

This project is built with Fresh and follows Deno conventions. Make sure to run `deno task check` before committing changes.
