
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
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import { Trade } from "../models/types";

interface OptionsRecentTradesTableProps {
  trades: Trade[];
  loading: boolean;
  error: string | null;
}

export default function OptionsRecentTradesTable({ trades, loading, error }: OptionsRecentTradesTableProps) {
  if (loading) {
    return (
      <Card variant="outlined" sx={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography>Loading trades...</Typography>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" sx={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography color="error">Error: {error}</Typography>
      </Card>
    );
  }

  if (!Array.isArray(trades) || trades.length === 0) {
    return (
      <Card variant="outlined" sx={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography>No recent trades found.</Typography>
      </Card>
    );
  }

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
        title="Recent Trades"
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
      <CardContent sx={{ flexGrow: 1, pt: 0, pb: 2, px: 0 }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="recent trades table">
            <TableHead>
              <TableRow>
                <TableCell>Transaction Date</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell>Contract Type</TableCell>
                <TableCell>Trade Type</TableCell>
                <TableCell>Strike Price</TableCell>
                <TableCell>Expiration Date</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell align="right">Premium</TableCell>
                <TableCell>Book Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trades.map((trade) => (
                <TableRow
                  key={trade.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {trade.transactionDate}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="medium">{trade.symbol}</Typography>
                  </TableCell>
                  <TableCell>{trade.contractType}</TableCell>
                  <TableCell>
                    <Typography
                      color={trade.tradeType?.startsWith('BUY') ? "error.main" : "success.main"}
                      sx={{ 
                        display: "flex", 
                        alignItems: "center",
                        fontWeight: "medium"
                      }}
                    >
                      {trade.tradeType?.startsWith('BUY') ? (
                        <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                      ) : (
                        <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                      )}
                      {trade.tradeType?.replace(/_/g, ' ')}
                    </Typography>
                  </TableCell>
                  <TableCell>${(trade.strikePrice ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{trade.expirationDate}</TableCell>
                  <TableCell>{trade.quantity}</TableCell>
                  <TableCell align="right">
                    <Typography
                      fontWeight="medium"
                      color={(trade.premium ?? 0) > 0 ? "success.main" : "error.main"}
                    >
                      ${(trade.premium ?? 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>${(trade.bookCost ?? 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
