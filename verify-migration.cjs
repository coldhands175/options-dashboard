const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function verifyMigration() {
  try {
    console.log('🔍 Verifying migration data...');
    
    // Get all trades with the test user first
    const testResult = await execAsync(`npx convex run functions:getTrades '{"userId": "test-user"}'`);
    console.log('Test trades found:', JSON.parse(testResult.stdout).length);
    
    // Check the actual migrated user ID found from debug query
    const migratedUserId = 'migrated-user-1752958388313';
    
    try {
      const result = await execAsync(`npx convex run functions:getTrades '{"userId": "${migratedUserId}"}'`);
      const trades = JSON.parse(result.stdout);
      
      if (trades.length > 0) {
        console.log(`✅ Migration successful! Found ${trades.length} trades for userId: ${migratedUserId}`);
        console.log('\n📊 Sample migrated trade:');
        console.log(JSON.stringify(trades[0], null, 2));
        
        // Also check positions
        const positionsResult = await execAsync(`npx convex run functions:getPositions '{"userId": "${migratedUserId}"}'`);
        const positions = JSON.parse(positionsResult.stdout);
        console.log(`\n📈 Generated positions: ${positions.length}`);
        
        if (positions.length > 0) {
          console.log('Sample position:');
          console.log(JSON.stringify(positions[0], null, 2));
        }
        
        return;
      }
    } catch (error) {
      console.error('Error querying migrated trades:', error.message);
    }
    
    console.log('❌ No migrated trades found with expected userIds');
    
  } catch (error) {
    console.error('Error verifying migration:', error.message);
  }
}

verifyMigration();
