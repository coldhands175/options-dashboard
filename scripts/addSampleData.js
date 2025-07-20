#!/usr/bin/env node

// This script adds sample trade data to Convex for testing
import { ConvexClient } from 'convex/browser';
import dotenv from 'dotenv';

async function addSampleData() {
  // Read the deployment URL from .env.local
  dotenv.config({ path: '.env.local' });
  
  const deploymentUrl = process.env.VITE_CONVEX_URL;
  if (!deploymentUrl) {
    console.error('VITE_CONVEX_URL not found in .env.local');
    process.exit(1);
  }

  console.log('Connecting to Convex deployment:', deploymentUrl);
  
  const client = new ConvexClient(deploymentUrl);

  try {
    console.log('Adding sample trades for userId: default-user');
    
    const result = await client.mutation('seedData:addSampleTrades', {
      userId: 'default-user'
    });

    console.log('✅ Success!', result);
    console.log(`Added ${result.addedTrades} sample trades`);
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }

  client.close();
}

addSampleData();
