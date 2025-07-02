import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchIcon from "@mui/icons-material/Search";
import InputBase from "@mui/material/InputBase";
import { alpha, styled } from "@mui/material/styles";

// Styled search input
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
  border: `1px solid ${theme.palette.divider}`,
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      width: "12ch",
      "&:focus": {
        width: "20ch",
      },
    },
  },
}));

// Sample watchlist data
const watchlistData = [
  {
    id: 1,
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 215.75,
    change: 2.45,
    changePercent: 1.15,
    ivPercentile: 65,
    volume: 32500000,
    averageVolume: 45000000,
    openInterestCalls: 1250000,
    openInterestPuts: 980000,
  },
  {
    id: 2,
    ticker: "MSFT",
    name: "Microsoft Corp.",
    price: 394.28,
    change: -1.35,
    changePercent: -0.34,
    ivPercentile: 72,
    volume: 22000000,
    averageVolume: 28000000,
    openInterestCalls: 880000,
    openInterestPuts: 750000,
  },
  {
    id: 3,
    ticker: "TSLA",
    name: "Tesla, Inc.",
    price: 238.65,
    change: 5.78,
    changePercent: 2.48,
    ivPercentile: 85,
    volume: 58000000,
    averageVolume: 62000000,
    openInterestCalls: 2200000,
    openInterestPuts: 1950000,
  },
  {
    id: 4,
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 122.35,
    change: 3.15,
    changePercent: 2.64,
    ivPercentile: 78,
    volume: 45000000,
    averageVolume: 42000000,
    openInterestCalls: 1650000,
    openInterestPuts: 1420000,
  },
  {
    id: 5,
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    price: 177.45,
    change: -0.85,
    changePercent: -0.48,
    ivPercentile: 58,
    volume: 35000000,
    averageVolume: 38000000,
    openInterestCalls: 980000,
    openInterestPuts: 820000,
  },
  {
    id: 6,
    ticker: "META",
    name: "Meta Platforms Inc.",
    price: 486.20,
    change: 2.35,
    changePercent: 0.49,
    ivPercentile: 62,
    volume: 18000000,
    averageVolume: 22000000,
    openInterestCalls: 750000,
    openInterestPuts: 680000,
  },
  {
    id: 7,
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    price: 174.85,
    change: 0.65,
    changePercent: 0.37,
    ivPercentile: 54,
    volume: 25000000,
    averageVolume: 28000000,
    openInterestCalls: 820000,
    openInterestPuts: 750000,
  },
];

export default function Watchlist() {
  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h5" component="h2">
              Market Watchlist
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search…"
                  inputProps={{ "aria-label": "search" }}
                />
              </Search>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
              >
                Add Symbol
              </Button>
            </Box>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }} aria-label="watchlist table">
              <TableHead>
                <TableRow>
                  <TableCell>Ticker</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>IV Percentile</TableCell>
                  <TableCell>Volume</TableCell>
                  <TableCell>Options Volume</TableCell>
                  <TableCell>Put/Call Ratio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {watchlistData.map((stock) => (
                  <TableRow
                    key={stock.id}
                    hover
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography fontWeight="medium">{stock.ticker}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stock.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">
                        ${stock.price.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        fontWeight="medium"
                        color={stock.change >= 0 ? "success.main" : "error.main"}
                      >
                        {stock.change >= 0 ? "+" : ""}
                        {stock.change.toFixed(2)} (
                        {stock.change >= 0 ? "+" : ""}
                        {stock.changePercent.toFixed(2)}%)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        fontWeight="medium"
                        color={
                          stock.ivPercentile > 70
                            ? "error.main"
                            : stock.ivPercentile > 50
                            ? "warning.main"
                            : "success.main"
                        }
                      >
                        {stock.ivPercentile}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(stock.volume / 1000000).toFixed(1)}M / {(stock.averageVolume / 1000000).toFixed(1)}M
                    </TableCell>
                    <TableCell>
                      {((stock.openInterestCalls + stock.openInterestPuts) / 1000000).toFixed(2)}M
                    </TableCell>
                    <TableCell>
                      {(stock.openInterestPuts / stock.openInterestCalls).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
