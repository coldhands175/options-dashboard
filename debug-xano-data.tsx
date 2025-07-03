import React, { useEffect, useState } from 'react';
import { xanoApi } from './src/services/xanoApi';

export default function DebugXanoData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await xanoApi.getTransactions();
        setData(result);
        console.log('Raw Xano Data:', result);
        
        // Log some sample trades to see structure
        if (result && result.length > 0) {
          console.log('Sample trade structure:', result[0]);
          console.log('Sample trade keys:', Object.keys(result[0]));
          
          // Look for Gilead trades specifically
          const gileadTrades = result.filter((trade: any) => 
            trade.Symbol && trade.Symbol.toUpperCase().includes('GILD')
          );
          console.log('Gilead trades found:', gileadTrades.length);
          if (gileadTrades.length > 0) {
            console.log('First Gilead trade:', gileadTrades[0]);
          }
          
          // Check for 2018-05-18 strike dates
          const may2018Trades = result.filter((trade: any) => 
            trade.StrikeDate && trade.StrikeDate.includes('2018-05-18')
          );
          console.log('May 18, 2018 strike trades found:', may2018Trades.length);
          if (may2018Trades.length > 0) {
            console.log('First May 18, 2018 trade:', may2018Trades[0]);
          }
        }
      } catch (err) {
        setError((err as Error).message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading debug data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Xano Data Debug</h2>
      <p>Total records: {data?.length || 0}</p>
      
      <h3>Data Structure Sample</h3>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', maxHeight: '400px' }}>
        {JSON.stringify(data?.[0], null, 2)}
      </pre>
      
      <h3>All Data</h3>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', maxHeight: '600px' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
