# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Day-trader is a trading application designed to monitor stocks and enable implementation of trading algorithms.

**Current Status:** Initial project setup phase - core infrastructure and architecture are being established.

## Technology Stack

Based on repository configuration:
- **Runtime:** Node.js (JavaScript/TypeScript indicated by .gitignore patterns)
- **Expected patterns:** Modern JavaScript tooling (npm/yarn, TypeScript compilation, etc.)

## Project Structure

*To be documented as the project develops. Key areas to establish:*
- Source code organization (src/, lib/, or similar)
- Trading algorithm implementation patterns
- Stock monitoring and data ingestion architecture
- Configuration management for trading parameters
- Test structure and conventions

## Development Commands

*To be added once build tooling is configured. Expected commands to document:*
- `npm install` / `yarn install` - Install dependencies
- Build/compilation commands
- Test execution (unit, integration, e2e)
- Linting and formatting
- Local development server (if applicable)

## Architecture Considerations

*Key architectural decisions to document as they emerge:*
- **Data flow:** How stock data is fetched, processed, and stored
- **Algorithm execution:** How trading strategies are implemented and executed
- **State management:** How trading positions and portfolio state are tracked
- **API integrations:** Stock market data providers and brokerage APIs
- **Real-time processing:** How live market data is handled
- **Risk management:** Safeguards and validation for trading decisions

## Important Notes

- Environment variables (.env files) are gitignored - ensure proper configuration for different environments
- Trading applications require careful testing and validation before live deployment
- Consider paper trading / simulation modes for algorithm development and testing
