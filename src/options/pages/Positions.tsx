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
        console.log("Xano Auth Token (Positions.tsx):", import.meta.env.VITE_XANO_AUTH_TOKEN);
        const response = await fetch(
          "https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO/transactions",
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_XANO_AUTH_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        tradesRef.current = data as Trade[];
        const fetchedTrades: Trade[] = tradesRef.current.map((item: any) => {
          const mappedItem: Trade = {
            id: item.id,
            Transaction_Date: item.Transaction_Date,
            tradeType: item.tradeType ?? 'Other',
            Symbol: item.Symbol,
            contractType: item.contractType,
            Quantity: item.Quantity ?? 0,
            StrikeDate: item.StrikeDate ?? '',
            StrikePrice: item.StrikePrice ?? 0,
            PremiumValue: item.PremiumValue ?? 0,
            Book_Cost: item.Book_Cost ?? 0,
            Security_Number: item.Security_Number,
            status: item.status ?? 'Open',
            profitLoss: item.profitLoss ?? 0,
          };
          return mappedItem;
        });

        const positionManager = new PositionManager(fetchedTrades);
        setPositions(positionManager.getPositions());
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
                        color={(position.profitLoss ?? 0) >= 0 ? "success.main" : "error.main"}
                      >
                        {(position.profitLoss ?? 0) >= 0 ? "+" : ""}${(position.profitLoss ?? 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={position.status}
                        size="small"
                        color={position.status === "Open" ? "primary" : "default"}
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
