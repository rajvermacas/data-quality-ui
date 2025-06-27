# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Data Quality UI Dashboard** built with Next.js 14 and TypeScript. The application visualizes data quality metrics through interactive charts, heatmaps, and health matrices, with AI-powered query capabilities via Google Gemini integration.

## Common Development Commands

```bash
# Development
npm run dev              # Start development server (http://localhost:3000)
npm run build           # Production build
npm run start           # Start production server
npm run lint            # ESLint code checking
npm run lint:fix        # Auto-fix ESLint issues

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report (75% threshold)
npm run test:ci         # Run tests for CI (includes coverage)

# Single test files
npm test Dashboard.test.tsx
npm test -- --testNamePattern="should render metrics cards"
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom data visualization themes
- **Charts**: Recharts for time-series, heatmaps, and health matrices
- **Data Processing**: Papa Parse for CSV file handling
- **AI Integration**: Google Gemini API for natural language queries
- **Testing**: Jest + React Testing Library

### Core Components Architecture

**Dashboard Flow**: `Dashboard.tsx` → Feature Components → UI Components
- `Dashboard.tsx`: Main container, state management, CSV data loading
- `features/`: Domain-specific components (TrendChart, Heatmap, etc.)
- `ui/`: Reusable UI utilities (ChartExport, etc.)

**Data Pipeline**: CSV → `dataProcessor.ts` → Components
- Data source: `/resources/artifacts/full_summary.csv`
- Processing: Validation, transformation, metrics calculation
- State: Multi-dimensional filtering with 29 data fields per record

### Key Files and Responsibilities

- `src/app/api/gemini-query/route.ts`: AI query API endpoint
- `src/lib/dataProcessor.ts`: Core data transformation and metrics
- `src/types/index.ts`: Central TypeScript definitions
- `src/components/features/`: All dashboard visualizations
- `__tests__/`: Mirrors src structure for comprehensive testing

## Development Guidelines

### File Organization
- Components grouped by feature, not by type
- Keep files under 800 lines (break into smaller modules if exceeded)
- Tests mirror source structure in `__tests__/`

### Data Model
The application processes `DataQualityRecord` objects with:
- 29 fields including failure rates, trends, system/dimension metadata
- Multi-tenant filtering capabilities
- Time-series data for trend analysis

### Testing Requirements
- **Coverage**: Maintain 75% minimum threshold
- **TDD Approach**: Write tests before implementing features
- **Mock Strategy**: Browser APIs properly mocked (ResizeObserver, matchMedia)
- **Test Types**: Unit tests for utilities, integration tests for components

### State Management
- React state for UI interactions and filtering
- CSV data loaded once at dashboard initialization
- Filter state manages multi-dimensional data slicing
- No external state management library (Redux/Zustand) currently used

### AI Integration
- Gemini API integration for natural language data queries
- API route handles prompt engineering and response formatting
- Error handling for API failures and rate limiting

### Development Stages
Project follows 5-stage MVP approach:
1. **Stage 1-3**: Complete (core functionality, filtering, visualizations)
2. **Stage 4-5**: Pending (performance optimization, production hardening)

## Data Processing Notes

### CSV Structure
- Primary data file: `/resources/artifacts/full_summary.csv`
- Headers define 29 fields including failure rates, trends, metadata
- Data validation ensures type safety during processing

### Filtering System
- Multi-dimensional: Dataset, System, Dimension, Tenant, Environment
- Date range filtering capabilities
- Dynamic filter state management

### Chart Types
- **TrendChart**: Time-series with Recharts LineChart
- **Heatmap**: Grid visualization with color-coded failure rates  
- **SystemHealthMatrix**: Cross-tabulated health indicators
- **MetricsCards**: Summary statistics display

## Performance Considerations

- Memoization used in data processing functions
- Efficient CSV parsing with Papa Parse
- Component-level optimization for large datasets
- Future: Implement virtualization for large data tables (Stage 4)

## Environment Setup

- Node.js project with standard Next.js structure
- TypeScript strict mode enabled
- Tailwind configured with custom data visualization color schemes
- Path aliases: `@/*` maps to `./src/*`