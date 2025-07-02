import { useState, useEffect } from 'react';
import { Trade, Position } from '../models/types';
import { PositionManager } from '../models/positionManager';

/**
 * Hook to use PositionManager in React components
 */
export function usePositionManager(initialTrades: Trade[] = []) {
  const [manager] = useState<PositionManager>(() => new PositionManager(initialTrades));
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // Initialize data from manager
  useEffect(() => {
    setTrades(manager.getTrades());
    setPositions(manager.getPositions());
  }, [manager]);

  // Add a single trade
  const addTrade = (trade: Omit<Trade, 'id' | 'positionId'>) => {
    const newTrade = manager.addTrade(trade);
    setTrades(manager.getTrades());
    setPositions(manager.getPositions());
    return newTrade;
  };

  // Add multiple trades at once
  const addTrades = (newTrades: Omit<Trade, 'id' | 'positionId'>[]) => {
    const result = manager.addTrades(newTrades);
    setTrades(manager.getTrades());
    setPositions(manager.getPositions());
    return result;
  };

  // Delete a trade
  const deleteTrade = (tradeId: number) => {
    const result = manager.deleteTrade(tradeId);
    if (result) {
      setTrades(manager.getTrades());
      setPositions(manager.getPositions());
    }
    return result;
  };

  // Update a trade
  const updateTrade = (tradeId: number, updates: Partial<Trade>) => {
    const result = manager.updateTrade(tradeId, updates);
    if (result) {
      setTrades(manager.getTrades());
      setPositions(manager.getPositions());
    }
    return result;
  };

  // Handle assignment or exercise
  const handleAssignmentOrExercise = (
    positionId: string,
    date: string,
    fees: number = 0
  ) => {
    const result = manager.handleAssignmentOrExercise(positionId, date, fees);
    if (result) {
      setTrades(manager.getTrades());
      setPositions(manager.getPositions());
    }
    return result;
  };

  // Roll a position
  const rollPosition = (
    positionId: string,
    date: string,
    newStrike: number,
    newExpiration: string,
    closePremium: number,
    openPremium: number,
    quantity: number,
    fees: number = 0
  ) => {
    const result = manager.rollPosition(
      positionId,
      date,
      newStrike,
      newExpiration,
      closePremium,
      openPremium,
      quantity,
      fees
    );
    
    if (result) {
      setTrades(manager.getTrades());
      setPositions(manager.getPositions());
    }
    return result;
  };

  // Get trades for a specific position
  const getTradesForPosition = (positionId: string) => {
    return manager.getTradesForPosition(positionId);
  };

  // Calculate performance metrics
  const calculatePerformanceMetrics = () => {
    return manager.calculatePerformanceMetrics();
  };

  // Filter by status
  const getOpenPositions = () => manager.getOpenPositions();
  const getClosedPositions = () => manager.getClosedPositions();

  return {
    trades,
    positions,
    addTrade,
    addTrades,
    deleteTrade,
    updateTrade,
    getTradesForPosition,
    handleAssignmentOrExercise,
    rollPosition,
    calculatePerformanceMetrics,
    getOpenPositions,
    getClosedPositions
  };
}
