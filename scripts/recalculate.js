import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://brilliant-wildebeest-420.convex.cloud");

async function recalculatePositions() {
  try {
    const result = await client.mutation("functions:recalculateAllPositions", {
      userEmail: "msbaxter@gmail.com"
    });
    console.log("Recalculation result:", result);
  } catch (error) {
    console.error("Recalculation failed:", error);
  }
}

recalculatePositions();
