export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { default: cron } = await import("node-cron");
  const { syncInstalls, syncTransactions, syncReviews } = await import("@/workers/sync");

  const syncMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || "2", 10);
  const reviewMinutes = parseInt(process.env.REVIEWS_INTERVAL_MINUTES || "30", 10);

  // Run initial sync on boot
  console.log("[mantle-oss] Starting initial sync...");
  await Promise.all([syncInstalls(), syncTransactions()]);
  await syncReviews();
  console.log("[mantle-oss] Initial sync complete");

  cron.schedule(`*/${syncMinutes} * * * *`, async () => {
    await Promise.all([syncInstalls(), syncTransactions()]);
  });

  cron.schedule(`*/${reviewMinutes} * * * *`, async () => {
    await syncReviews();
  });

  console.log(
    `[mantle-oss] Workers started — installs/revenue every ${syncMinutes}m, reviews every ${reviewMinutes}m`
  );
}
