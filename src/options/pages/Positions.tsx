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
import { Trade, Position } from "../models/types";
import { PositionManager } from "../models/positionManager";
import { xanoApi } from "../../services/xanoApi";

export default function Positions() {
  const tradesRef = React.useRef<Trade[] | null>(null);
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tradesRef.current) {
      const positionManager = new PositionManager(tradesRef.current);
      setPositions(positionManager.getPositions());
      setLoading(false);
      return;
    }

    const fetchPositions = async () => {
      try {
        const data = await xanoApi.getTransactions();
        tradesRef.current = data as Trade[];
        const fetchedTrades: Trade[] = tradesRef.current.map((item: any) => {
          // Normalize trade type: "Sold" -> "sell", "Bought" -> "buy"
          let normalizedTradeType = 'other';
          if (item.tradeType) {
            const tradeTypeLower = item.tradeType.toLowerCase();
            if (tradeTypeLower.includes('sold') || tradeTypeLower.includes('sell')) {
              normalizedTradeType = 'sell';
            } else if (tradeTypeLower.includes('bought') || tradeTypeLower.includes('buy')) {
              normalizedTradeType = 'buy';
            }
          }
          
          // Normalize status: "Open" -> "open", "Closed" -> "close"
          let normalizedStatus = 'open';
          if (item.status) {
            const statusLower = item.status.toLowerCase();
            if (statusLower.includes('close')) {
              normalizedStatus = 'close';
            } else if (statusLower.includes('open')) {
              normalizedStatus = 'open';
            }
          }
          
          const mappedItem: Trade = {
            id: item.id,
            Transaction_Date: item.Transaction_Date,
            tradeType: normalizedTradeType,
            Symbol: item.Symbol,
            contractType: item.contractType,
            Quantity: Number(item.Quantity) || 0,
            StrikeDate: item.StrikeDate ?? '',
            StrikePrice: Number(item.StrikePrice) || 0,
            PremiumValue: Number(item.PremiumValue) || 0,
            Book_Cost: Number(item.Book_Cost) || 0,
            Security_Number: item.Security_Number,
            status: normalizedStatus,
          };
          return mappedItem;
        });

        console.log('Fetched trades for position manager:', fetchedTrades.length, 'trades');
        if (fetchedTrades.length > 0) {
          console.log('First trade sample:', {
            id: fetchedTrades[0].id,
            tradeType: fetchedTrades[0].tradeType,
            status: fetchedTrades[0].status,
            Symbol: fetchedTrades[0].Symbol,
            PremiumValue: fetchedTrades[0].PremiumValue,
            Book_Cost: fetchedTrades[0].Book_Cost
          });
        }
        
        const positionManager = new PositionManager(fetchedTrades);
        const calculatedPositions = positionManager.getPositions();
        
        console.log('Calculated positions:', calculatedPositions);
        calculatedPositions.forEach((pos, index) => {
          if (index < 5) { // Log first 5 positions to avoid console spam
            console.log(`Position ${index + 1}:`, {
              id: pos.id,
              ticker: pos.ticker,
              type: pos.type,
              status: pos.status,
              expiration: pos.expiration,
              totalSales: pos.totalSalesBookCost,
              totalPurchases: pos.totalPurchasesBookCost,
              pnl: pos.totalSalesBookCost - pos.totalPurchasesBookCost,
              trades: pos.trades
            });
          }
        });
        
        setPositions(calculatedPositions);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, []);

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
          
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }} aria-label="active positions table">
              <TableHead>
                <TableRow>
                  <TableCell>Ticker</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell>Strike</TableCell>
                  <TableCell>Expiration</TableCell>
                  <TableCell>Open Date</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell align="right">P/L</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <Typography fontWeight="medium">{position.ticker}</Typography>
                    </TableCell>
                    <TableCell>{position.type}</TableCell>
                    <TableCell>${position.strike ?? 'N/A'}</TableCell>
                    <TableCell>{position.expiration || 'N/A'}</TableCell>
                    <TableCell>{position.openDate || 'N/A'}</TableCell>
                    <TableCell>{position.currentQuantity ?? 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight="medium"
                        color={(position.totalSalesBookCost - position.totalPurchasesBookCost) >= 0 ? "success.main" : "error.main"}
                      >
                        {(position.totalSalesBookCost - position.totalPurchasesBookCost) >= 0 ? "+" : ""}${(position.totalSalesBookCost - position.totalPurchasesBookCost).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={position.status}
                        size="small"
                        color={
                          position.status === "Open" 
                            ? "primary" 
                            : position.status === "Expired" 
                            ? "warning" 
                            : "default"
                        }
                        sx={{
                          backgroundColor: position.status === "Expired" ? "warning.light" : undefined,
                          color: position.status === "Expired" ? "warning.contrastText" : undefined,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
