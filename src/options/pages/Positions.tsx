import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import TableSortLabel from "@mui/material/TableSortLabel";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Trade, Position } from "../models/types";
import { useQuery, api } from '../../lib/convex';
import { convexPositionToPosition, convexTradeToTrade } from '../../lib/convexUtils';

export default function Positions() {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [allPositions, setAllPositions] = React.useState<Position[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<keyof Position>('symbol');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [yearFilter, setYearFilter] = React.useState<string>('All');
  const [symbolFilter, setSymbolFilter] = React.useState<string>('All');
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  // Using global positions and trades data for single-source dashboard
  const convexPositions = useQuery(api.functions.getAllPositions);
  const convexTrades = useQuery(api.functions.getAllTrades);

  React.useEffect(() => {
    if (convexPositions !== undefined && convexTrades !== undefined) {
      if (convexPositions && convexPositions.length > 0) {
        // Convert Convex positions to Position format and manually attach trades
        const convertedPositions = convexPositions.map(convexPosition => {
          // Find trades for this position
          const positionTrades = convexTrades.filter(trade => 
            trade.positionId === convexPosition.positionKey
          );
          const convertedTrades = positionTrades.map(convexTradeToTrade);
          
          return {
            id: convexPosition.positionKey,
            symbol: convexPosition.symbol,
            strikePrice: convexPosition.strikePrice,
            expirationDate: convexPosition.expirationDate,
            contractType: convexPosition.contractType,
            strategy: convexPosition.strategy,
            status: convexPosition.status,
            openDate: convexPosition.openDate,
            closeDate: convexPosition.closeDate,
            trades: convertedTrades,
            netQuantity: convexPosition.netQuantity,
            totalPremium: convexPosition.totalPremium,
            totalCommission: convexPosition.totalCommission,
            totalFees: convexPosition.totalFees,
            realizedPL: convexPosition.realizedPL,
            unrealizedPL: convexPosition.unrealizedPL,
            daysToExpiration: convexPosition.daysToExpiration,
          };
        });
        
        setPositions(convertedPositions);
        setAllPositions(convertedPositions);
        setError(null);
      } else {
        setPositions([]);
        setAllPositions([]);
      }
      setLoading(false);
    }
  }, [convexPositions, convexTrades]);

  // Handle loading state from useQuery
  React.useEffect(() => {
    if (convexPositions === undefined || convexTrades === undefined) {
      setLoading(true);
    }
  }, [convexPositions, convexTrades]);

  // Filter and sort effect
  React.useEffect(() => {
    let filteredPositions = [...allPositions];

    // Apply year filter
    if (yearFilter !== 'All') {
      filteredPositions = filteredPositions.filter((position) =>
        position.expirationDate.startsWith(yearFilter)
      );
    }

    // Apply symbol filter
    if (symbolFilter !== 'All') {
      filteredPositions = filteredPositions.filter((position) =>
        position.symbol === symbolFilter
      );
    }

    // Apply sorting
    filteredPositions.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      return 0;
    });

    setPositions(filteredPositions);
  }, [allPositions, yearFilter, symbolFilter, sortBy, sortOrder]);

  const handleSort = (field: keyof Position) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const uniqueYears = React.useMemo(() => {
    return Array.from(new Set(allPositions.map((p) => p.expirationDate.slice(0, 4)))).sort();
  }, [allPositions]);
  
  const symbols = React.useMemo(() => {
    return Array.from(new Set(allPositions.map((p) => p.symbol))).sort();
  }, [allPositions]);

  const handleRowExpand = (positionId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(positionId)) {
      newExpandedRows.delete(positionId);
    } else {
      newExpandedRows.add(positionId);
    }
    setExpandedRows(newExpandedRows);
  };

  if (loading) {
    return (
      <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" }, display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Typography>Loading positions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" }, display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
            Active Positions
          </Typography>
          
          {/* Filtering Controls */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Year</InputLabel>
                <Select
                  value={yearFilter}
                  label="Filter by Year"
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <MenuItem value="All">All Years</MenuItem>
                  {uniqueYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Symbol</InputLabel>
                <Select
                  value={symbolFilter}
                  label="Filter by Symbol"
                  onChange={(e) => setSymbolFilter(e.target.value)}
                >
                  <MenuItem value="All">All Symbols</MenuItem>
                  {symbols.map((symbol) => (
                    <MenuItem key={symbol} value={symbol}>
                      {symbol}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                Showing {positions.length} of {allPositions.length} positions
              </Typography>
            </Grid>
          </Grid>
          
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }} aria-label="active positions table">
              <TableHead>
                <TableRow>
                  <TableCell width={50}></TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'symbol'}
                      direction={sortBy === 'symbol' ? sortOrder : 'asc'}
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'strategy'}
                      direction={sortBy === 'strategy' ? sortOrder : 'asc'}
                      onClick={() => handleSort('strategy')}
                    >
                      Strategy
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'strikePrice'}
                      direction={sortBy === 'strikePrice' ? sortOrder : 'asc'}
                      onClick={() => handleSort('strikePrice')}
                    >
                      Strike
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'expirationDate'}
                      direction={sortBy === 'expirationDate' ? sortOrder : 'asc'}
                      onClick={() => handleSort('expirationDate')}
                    >
                      Expiration
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'openDate'}
                      direction={sortBy === 'openDate' ? sortOrder : 'asc'}
                      onClick={() => handleSort('openDate')}
                    >
                      Open Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'netQuantity'}
                      direction={sortBy === 'netQuantity' ? sortOrder : 'asc'}
                      onClick={() => handleSort('netQuantity')}
                    >
                      Quantity
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">P/L</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'status'}
                      direction={sortBy === 'status' ? sortOrder : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.map((position) => {
                  const isExpanded = expandedRows.has(position.id);
                  const hasMultipleTrades = position.trades.length > 1;
                  const realizedPL = position.realizedPL ?? 0;

                  return (
                    <React.Fragment key={position.id}>
                      <TableRow>
                        <TableCell>
                          {hasMultipleTrades ? (
                            <IconButton
                              size="small"
                              onClick={() => handleRowExpand(position.id)}
                              aria-label={isExpanded ? "Collapse trades" : "Expand trades"}
                            >
                              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="medium">{position.symbol}</Typography>
                        </TableCell>
                        <TableCell>{position.strategy}</TableCell>
                        <TableCell>${position.strikePrice?.toFixed(2) ?? 'N/A'}</TableCell>
                        <TableCell>{position.expirationDate || 'N/A'}</TableCell>
                        <TableCell>{position.openDate || 'N/A'}</TableCell>
                        <TableCell>{position.netQuantity ?? 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Typography
                            fontWeight="medium"
                            color={realizedPL >= 0 ? "success.main" : "error.main"}
                          >
                            {realizedPL >= 0 ? "+" : ""}${realizedPL.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={position.status}
                            size="small"
                            color={
                              position.status === "OPEN" 
                                ? "primary" 
                                : position.status === "EXPIRED" 
                                ? "warning" 
                                : "default"
                            }
                            sx={{
                              backgroundColor: position.status === "EXPIRED" ? "warning.light" : undefined,
                              color: position.status === "EXPIRED" ? "warning.contrastText" : undefined,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Trades
                          </Typography>
                          <Table size="small" aria-label="trades">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Quantity</TableCell>
                                <TableCell align="right">Premium</TableCell>
                                <TableCell align="right">Fees</TableCell>
                                <TableCell align="right">Total Cost</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {position.trades.map((trade) => (
                                <TableRow key={trade.id}>
                                  <TableCell>{trade.transactionDate}</TableCell>
                                  <TableCell>{trade.tradeType}</TableCell>
                                  <TableCell>{trade.quantity}</TableCell>
                                  <TableCell align="right">${trade.premium.toFixed(2)}</TableCell>
                                  <TableCell align="right">${(trade.fees ?? 0).toFixed(2)}</TableCell>
                                  <TableCell align="right">${trade.bookCost.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
