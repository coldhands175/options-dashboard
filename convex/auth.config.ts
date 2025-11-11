export default {
  providers: [
    {
      // In dev, default to the local Next.js URL if CONVEX_SITE_URL isn't set by Convex.
      domain:
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
