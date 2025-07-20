/**
 * Data Migration Utility
 * This script helps migrate existing trade data from Xano to Convex
 */

import { xanoApi } from '../services/xanoApi';
import { useMutation } from '../lib/convex';
import { convexTradeFromTrade, getCurrentUserId } from '../lib/convexUtils';
import type { Trade } from '../options/models/types';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Migrate all trades from Xano to Convex
 * This should be run once after setting up Convex
 */
export async function migrateTradesFromXano(
  addTradeMutation: any // The Convex mutation function
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    failedCount: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting migration from Xano to Convex...');
    
    // Fetch all trades from Xano
    const xanoTrades = await xanoApi.getTransactions() as Trade[];
    console.log(`📊 Found ${xanoTrades.length} trades in Xano`);

    if (xanoTrades.length === 0) {
      console.log('✅ No trades to migrate');
      result.success = true;
      return result;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('User ID is required for migration');
    }

    // Migrate each trade
    for (const trade of xanoTrades) {
      try {
        const convexTrade = convexTradeFromTrade(trade);
        await addTradeMutation({
          userId,
          ...convexTrade
        });
        
        result.migratedCount++;
        console.log(`✅ Migrated trade ${trade.id} (${trade.symbol})`);
      } catch (error) {
        result.failedCount++;
        const errorMsg = `Failed to migrate trade ${trade.id}: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    result.success = result.failedCount === 0;
    
    console.log(`🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${result.migratedCount} trades`);
    if (result.failedCount > 0) {
      console.log(`❌ Failed to migrate: ${result.failedCount} trades`);
    }

  } catch (error) {
    result.errors.push((error as Error).message);
    console.error('💥 Migration failed:', error);
  }

  return result;
}

/**
 * React hook to perform migration
 */
export function useMigration() {
  const addTrade = useMutation('addTrade');

  const runMigration = async (): Promise<MigrationResult> => {
    return await migrateTradesFromXano(addTrade);
  };

  return { runMigration };
}

/**
 * Validation function to ensure Convex data matches Xano data
 */
export async function validateMigration(): Promise<{
  xanoCount: number;
  convexCount: number;
  match: boolean;
}> {
  try {
    const xanoTrades = await xanoApi.getTransactions() as Trade[];
    // Note: You'll need to call this from a component that has access to Convex
    // const convexTrades = await convexQuery('getTrades', getCurrentUserId());
    
    return {
      xanoCount: xanoTrades.length,
      convexCount: 0, // This would be set from the component
      match: false
    };
  } catch (error) {
    console.error('Validation failed:', error);
    return {
      xanoCount: 0,
      convexCount: 0,
      match: false
    };
  }
}
