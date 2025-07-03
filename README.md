# Options Dashboard

A comprehensive web application for tracking and managing options trading portfolios. Built with React, TypeScript, and Material-UI, it provides real-time data visualization, trade management, and performance analytics for options traders.

## Features

- 📊 **Real-time Portfolio Tracking** - Monitor your options positions with live data
- 📈 **Advanced Analytics** - Performance metrics, win rates, and risk analysis
- 🎨 **Modern UI** - Clean, responsive design with dark/light mode support
- 📱 **Mobile Responsive** - Works seamlessly on desktop and mobile devices
- 🔄 **Real-time Updates** - Live market data and portfolio updates
- 📁 **Trade Management** - Import, export, and manage your trading history
- ⚡ **High Performance** - Optimized for handling large datasets

## Screenshots

![Dashboard Overview](./docs/images/dashboard-overview.png)
![Portfolio Analysis](./docs/images/portfolio-analysis.png)

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Xano account for backend data (optional for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/options-dashboard.git
   cd options-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your Xano authentication token
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🔒 Security Setup (IMPORTANT)

**Before running the application**, you must set up your environment variables:

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your actual Xano authentication token:
   ```bash
   # Replace 'your_xano_auth_token_here' with your actual token
   VITE_XANO_AUTH_TOKEN=your_actual_token_here
   ```

3. **NEVER commit the `.env` file** - it's already in `.gitignore`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:deploy` - Build for deployment (skips TypeScript checks)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Shared components
│   └── TradingViewWidget.tsx
├── options/            # Main application code
│   ├── components/     # Options-specific components
│   ├── models/         # Data models and types
│   ├── pages/          # Page components
│   └── hooks/          # Custom React hooks
├── shared-theme/       # Theme configuration
└── tradingview-overrides.css
```

## Core Features

### Dashboard
- Portfolio value tracking
- Performance metrics
- Active positions overview
- Recent trades table
- Market watchlist

### Portfolio Management
- Position tracking with real-time updates
- Profit/Loss calculations
- Risk metrics and analysis
- Performance attribution

### Trade Management
- Trade history with filtering and sorting
- CSV/PDF export functionality
- Bulk trade import
- Position reconciliation

### Analytics
- Win rate analysis
- Risk-adjusted returns
- Strategy performance breakdown
- Custom date range analysis

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI v7
- **Charts**: MUI X Charts, TradingView widgets
- **Routing**: React Router v7
- **Build Tool**: Vite
- **Backend**: Xano (current)
- **Deployment**: Vercel

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation for any API changes
- Follow the existing code style and conventions

## API Integration

The application currently integrates with Xano for backend data storage. To set up your own backend:

1. Create a Xano account
2. Set up the required database tables (see `src/options/models/types.ts`)
3. Configure your API endpoints
4. Add your authentication token to `.env`

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Build the project: `npm run build:deploy`
3. Deploy: `vercel --prod`

### Manual Deployment

1. Build the project: `npm run build`
2. Upload the `dist` folder to your hosting provider

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_XANO_AUTH_TOKEN` | Xano API authentication token | Yes |

## Troubleshooting

### Common Issues

**Issue**: TradingView widget not loading
- **Solution**: Check your internet connection and ensure the widget scripts are not blocked

**Issue**: API requests failing
- **Solution**: Verify your `VITE_XANO_AUTH_TOKEN` is correct and has proper permissions

**Issue**: Build failures
- **Solution**: Try `npm run build:deploy` which skips TypeScript strict checks

### Getting Help

- Check the [GitHub Issues](https://github.com/yourusername/options-dashboard/issues)
- Review the [Project Plan](./PROJECT_PLAN.md)
- Contact the development team

## Roadmap

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed development roadmap and feature specifications.

### Upcoming Features

- Real-time market data integration
- Advanced options strategies
- Mobile app (React Native)
- Broker API integrations
- Machine learning analytics

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Material-UI team for the excellent component library
- TradingView for their charting widgets
- The React and TypeScript communities

---

**⚠️ Disclaimer**: This application is for educational and informational purposes only. It is not intended as financial advice. Always consult with a qualified financial advisor before making investment decisions.
