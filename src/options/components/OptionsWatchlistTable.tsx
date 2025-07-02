import * as React from "react";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Button from "@mui/material/Button";

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
  },
  {
    id: 2,
    ticker: "MSFT",
    name: "Microsoft Corp.",
    price: 394.28,
    change: -1.35,
    changePercent: -0.34,
    ivPercentile: 72,
  },
  {
    id: 3,
    ticker: "TSLA",
    name: "Tesla, Inc.",
    price: 238.65,
    change: 5.78,
    changePercent: 2.48,
    ivPercentile: 85,
  },
  {
    id: 4,
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 122.35,
    change: 3.15,
    changePercent: 2.64,
    ivPercentile: 78,
  },
  {
    id: 5,
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    price: 177.45,
    change: -0.85,
    changePercent: -0.48,
    ivPercentile: 58,
  },
];

export default function OptionsWatchlistTable() {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader
        title="Options Watchlist"
        titleTypographyProps={{
          fontSize: "1.125rem",
          fontWeight: "500",
        }}
        action={
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardContent sx={{ flexGrow: 1, pt: 0, pb: 0, px: 0 }}>
        <TableContainer>
          <Table aria-label="watchlist table">
            <TableHead>
              <TableRow>
                <TableCell>Ticker</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>IV %ile</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {watchlistData.map((stock) => (
                <TableRow
                  key={stock.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
      <Button
        startIcon={<AddRoundedIcon />}
        size="small"
        sx={{ m: 2, alignSelf: "flex-start" }}
      >
        Add Symbol
      </Button>
    </Card>
  );
}
