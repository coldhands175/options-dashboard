# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.0.0] - 2025-07-20

### BREAKING CHANGES
- **Database Migration**: Complete migration from Xano to Convex database system
- **Authentication System**: Updated to Convex Auth with Clerk integration
- **API Changes**: All data fetching now uses Convex real-time queries

### Added
- **Real-time Data Synchronization**: Live updates across all dashboard components using Convex
- **Advanced Position Management**: Enhanced position status tracking (OPEN/CLOSED/EXPIRED/ASSIGNED)
- **Automatic P&L Calculation**: Smart handling of expired single-trade positions
- **Document Processing**: Claude AI integration for trade document analysis and extraction
- **Trade Classification System**: Automatic detection and correction of trade types
- **Expandable Position Tables**: Detailed trade breakdown with collapsible rows
- **Admin Dashboard**: Role-based access control and bulk operations
- **Bulk Import Tools**: Efficient batch processing of trade data
- **Migration Utilities**: Tools for importing data from legacy systems
- **Debug Functions**: Advanced debugging capabilities for position calculations

### Enhanced
- **Position Status Logic**: Proper handling of expired and assigned positions
- **P&L Calculations**: Accurate realized gains for options that expire worthless
- **UI/UX Experience**: Improved responsive design and loading states
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Type Safety**: Enhanced TypeScript integration throughout
- **Data Relationships**: Better linking between trades and positions
- **Performance**: Optimized queries and real-time updates

### Technical Improvements
- **Database Schema**: New Convex schema with proper indexing and relationships
- **Authentication Flow**: Secure user management with admin role support
- **Real-time Updates**: WebSocket-based live data synchronization
- **Data Validation**: Enhanced input validation and error handling
- **Security**: Role-based access control and secure API endpoints

### Fixed
- **Position Status**: Expired single-trade positions now correctly calculate realized P&L
- **Trade Type Classification**: Automatic correction of misclassified trade types
- **Data Consistency**: Improved synchronization between trades and positions
- **Mobile Responsiveness**: Better display on mobile devices
- **Loading States**: Proper handling of async operations

### Migration Notes
- Users will need to re-authenticate due to the new auth system
- Existing data will be migrated automatically on first login
- Admin users can access bulk import tools for large data sets

---

## [v1.4.0] - 2025-07-19

### Added
- **Claude Sonnet 4 Integration**: AI-powered document processing for trade statements
- **Stock Quote Popup**: Real-time stock information in navbar search
- **Watchlist Deduplication**: Improved symbol management and sorting

### Enhanced
- **Symbol Sorting**: Alphabetical ordering across all components
- **Search Functionality**: Better stock symbol lookup and selection

---

## [v1.3.0] - 2025-07-18

### Added
- **Unified Stock Symbols**: Consistent symbol handling across ticker and watchlist
- **Improved Watchlist**: Enhanced user experience and data management

### Fixed
- **Symbol Synchronization**: Better coordination between different components

---

## [Earlier Versions]
- Initial project setup and core functionality
- Basic options trading dashboard
- Xano database integration
- Core UI components and routing

[v2.0.0]: https://github.com/yourusername/options-dashboard/compare/v1.4.0...v2.0.0
[v1.4.0]: https://github.com/yourusername/options-dashboard/compare/v1.3.0...v1.4.0
[v1.3.0]: https://github.com/yourusername/options-dashboard/compare/v1.2.0...v1.3.0
