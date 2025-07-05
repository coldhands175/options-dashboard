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
import { xanoApi, XanoApiError } from "../../services/xanoApi";

export default function Trades() {
  const tradesRef = React.useRef<Trade[] | null>(null);
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tradesRef.current) {
      setTrades(tradesRef.current);
      setLoading(false);
      return;
    }

    const fetchTrades = async () => {
      try {
        const data = await xanoApi.getTransactions();
        // Ensure the fetched data aligns with the Trade interface
        tradesRef.current = data as Trade[];
        setTrades(tradesRef.current);
      } catch (err) {
        if (err instanceof XanoApiError && err.code === 'RATE_LIMITED') {
          setError('Too many requests. Please wait a moment and refresh the page.');
        } else {
          setError((err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [orderBy, setOrderBy] = React.useState<keyof Trade>('Transaction_Date');
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

    // Handle undefined or null values for sorting
    if (bValue === undefined || bValue === null) return -1;
    if (aValue === undefined || aValue === null) return 1;

    // Ensure values are comparable (e.g., convert to string for string comparison)
    const comparableA = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
    const comparableB = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

    if (comparableB < comparableA) {
      return -1;
    }
    if (comparableB > comparableA) {
      return 1;
    }
    return 0;
  };

  // Filter trades based on status and symbol filters
  const filteredTrades = React.useMemo(() => {
    let filtered = trades;

    if (statusFilter !== "all") {
      filtered = filtered.filter(trade => (trade.status || '').toLowerCase() === statusFilter);
    }

    if (symbolFilter) {
      filtered = filtered.filter(trade => (typeof trade.Symbol === 'string' ? trade.Symbol.toLowerCase() : '') === symbolFilter.toLowerCase());
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
      {/* Replaced Grid container with Box */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Replaced Grid item with Box */}
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
                  <MenuItem value="all">All Trades</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
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
                  {Array.from(new Set(trades.map(trade => trade.Symbol))).map(symbol => (
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
                  <TableCell sortDirection={orderBy === 'Transaction_Date' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'Transaction_Date'}
                      direction={orderBy === 'Transaction_Date' ? order : 'asc'}
                      onClick={() => handleRequestSort('Transaction_Date')}
                    >
                      Transaction Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'Symbol' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'Symbol'}
                      direction={orderBy === 'Symbol' ? order : 'asc'}
                      onClick={() => handleRequestSort('Symbol')}
                    >
                      Symbol
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Contract Type</TableCell>
                  <TableCell>Trade Type</TableCell>
                  <TableCell>Strike Price</TableCell>
                  <TableCell sortDirection={orderBy === 'StrikeDate' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'StrikeDate'}
                      direction={orderBy === 'StrikeDate' ? order : 'asc'}
                      onClick={() => handleRequestSort('StrikeDate')}
                    >
                      Strike Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell align="right">Premium Value</TableCell>
                  <TableCell align="right">Book Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTrades
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((trade) => (
                    <TableRow key={trade.id}><TableCell component="th" scope="row">
                        {trade.Transaction_Date || 'N/A'} {/* Use Transaction_Date */}
                      </TableCell><TableCell>
                        <Typography fontWeight="medium">{trade.Symbol || 'N/A'}</Typography> {/* Use Symbol */}
                      </TableCell><TableCell>{trade.contractType || 'N/A'}</TableCell><TableCell>
                        <Typography
                          color={
                            (typeof trade.tradeType === 'string' && trade.tradeType.toLowerCase() === "bought") ? "error.main" : "success.main" // Use tradeType
                          }
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            fontWeight: "medium"
                          }}
                        >
                          {(typeof trade.tradeType === 'string' && trade.tradeType.toLowerCase() === "bought") ? ( // 'Bought' is red down arrow
                            <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5, color: 'error.main' }} />
                          ) : ( // 'Sold' is green up arrow
                            <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} />
                          )}
                          {trade.tradeType || 'N/A'} {/* Use tradeType */}
                        </Typography>
                      </TableCell><TableCell>${trade.StrikePrice ?? 'N/A'}</TableCell><TableCell>{trade.StrikeDate || 'N/A'}</TableCell><TableCell>{trade.Quantity ?? 'N/A'}</TableCell><TableCell align="right">
                        <Typography
                          fontWeight="medium"
                          color={(trade.PremiumValue !== undefined && trade.PremiumValue !== null && trade.PremiumValue > 0) ? "success.main" : "error.main"} // Use PremiumValue
                        >
                          ${(typeof trade.PremiumValue === 'number' ? trade.PremiumValue : 0).toFixed(2)} {/* Removed '+' sign */}
                        </Typography>
                      </TableCell><TableCell align="right">
                        <Typography fontWeight="medium">
                          {(typeof trade.Book_Cost === 'number' && trade.Book_Cost < 0 ? '-' : '')}${(typeof trade.Book_Cost === 'number' ? Math.abs(trade.Book_Cost) : 0).toFixed(2)} {/* Display Book_Cost with negative sign before $ */}
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