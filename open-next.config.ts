import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Dummy incremental cache: this app has no ISR / "use cache", so it does not
// need an R2 bucket. Do not enable cacheComponents or partialPrefetching.
export default defineCloudflareConfig();
