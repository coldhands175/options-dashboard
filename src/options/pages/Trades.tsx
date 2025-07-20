// /Users/michaelbaxter/Documents/Windsurf Projects/BuilderIO/Material UI/src/options/pages/Trades.tsx

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// import Grid from "@mui/material/Grid"; // Remove this import
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import Paper from "@mui/material/Paper";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import TableSortLabel from "@mui/material/TableSortLabel"; // Import TableSortLabel
import { Trade } from "../models/types"; // Ensure Trade interface is correctly imported
import { useQuery, api } from '../../lib/convex';
import { getCurrentUserId, convexTradeToTrade } from '../../lib/convexUtils';

export default function Trades() {
  const userId = getCurrentUserId();
  const convexTrades = useQuery(api.functions.getTrades, { userId });
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (convexTrades !== undefined) {
      if (convexTrades) {
        // Convert Convex trades to our Trade format
        const convertedTrades = convexTrades.map(convexTradeToTrade);
        setTrades(convertedTrades);
        setError(null);
      } else {
        setTrades([]);
      }
      setLoading(false);
    }
  }, [convexTrades]);

  // Handle loading and error states from useQuery
  React.useEffect(() => {
    if (convexTrades === undefined) {
      setLoading(true);
    }
  }, [convexTrades]);

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [orderBy, setOrderBy] = React.useState<keyof Trade>('transactionDate');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
  const [symbolFilter, setSymbolFilter] = React.useState('');

  const handleRequestSort = (property: keyof Trade) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  const getComparator = React.useCallback(<Key extends keyof Trade>( 
    order: 'asc' | 'desc',
    orderBy: Key,
  ): (a: Trade, b: Trade) => number => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }, []);

  const descendingComparator = <T, Key extends keyof T>(
    a: T,
    b: T,
    orderBy: Key,
  ) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];

    if (bValue === undefined || bValue === null) return -1;
    if (aValue === undefined || aValue === null) return 1;

    const comparableA = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
    const comparableB = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

    if (comparableB < comparableA) return -1;
    if (comparableB > comparableA) return 1;
    return 0;
  };

  const filteredTrades = React.useMemo(() => {
    let filtered = trades;

    if (statusFilter !== "all") {
      filtered = filtered.filter(trade => trade.status.toLowerCase() === statusFilter);
    }

    if (symbolFilter) {
      filtered = filtered.filter(trade => trade.symbol.toLowerCase() === symbolFilter.toLowerCase());
    }

    return stableSort(filtered, getComparator(order, orderBy));
  }, [trades, statusFilter, symbolFilter, order, orderBy, getComparator]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value as string);
  };

  if (loading) {
    return (
      <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" }, display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Typography>Loading trades...</Typography>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h5" component="h2">
              Trade History
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="executed">Executed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="symbol-filter-label">Symbol</InputLabel>
                <Select
                  labelId="symbol-filter-label"
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value as string)}
                  label="Symbol"
                >
                  <MenuItem value="">All Symbols</MenuItem>
                  {Array.from(new Set(trades.map(trade => trade.symbol))).map(symbol => (
                    <MenuItem key={symbol} value={symbol}>{symbol}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }} aria-label="trades history table">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === 'transactionDate' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'transactionDate'}
                      direction={orderBy === 'transactionDate' ? order : 'asc'}
                      onClick={() => handleRequestSort('transactionDate')}
                    >
                      Transaction Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'symbol' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'symbol'}
                      direction={orderBy === 'symbol' ? order : 'asc'}
                      onClick={() => handleRequestSort('symbol')}
                    >
                      Symbol
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Contract Type</TableCell>
                  <TableCell>Trade Type</TableCell>
                  <TableCell>Strike Price</TableCell>
                  <TableCell sortDirection={orderBy === 'expirationDate' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'expirationDate'}
                      direction={orderBy === 'expirationDate' ? order : 'asc'}
                      onClick={() => handleRequestSort('expirationDate')}
                    >
                      Expiration Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell align="right">Premium</TableCell>
                  <TableCell align="right">Book Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTrades
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell component="th" scope="row">{trade.transactionDate}</TableCell>
                      <TableCell><Typography fontWeight="medium">{trade.symbol}</Typography></TableCell>
                      <TableCell>{trade.contractType}</TableCell>
                      <TableCell>
                        <Typography
                          color={trade.tradeType.startsWith('BUY') ? "error.main" : "success.main"}
                          sx={{ display: "flex", alignItems: "center", fontWeight: "medium" }}
                        >
                          {trade.tradeType.startsWith('BUY') ? (
                            <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                          ) : (
                            <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                          )}
                          {trade.tradeType.replace(/_/g, ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>${trade.strikePrice.toFixed(2)}</TableCell>
                      <TableCell>{trade.expirationDate}</TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium" color={trade.premium > 0 ? "success.main" : "error.main"}>
                          ${trade.premium.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {trade.bookCost < 0 ? '-' : ''}${Math.abs(trade.bookCost).toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredTrades.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box> {/* End of Box replacing Grid item */}
      </Box> {/* End of Box replacing Grid container */}
    </Box>
  );
}