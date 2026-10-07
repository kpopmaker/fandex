import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output:
    process.env.FANDEX_SELF_HOST_STANDALONE === "1"
      ? "standalone"
      : undefined,
  outputFileTracingIncludes: {
    "/*": [
      "./data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json",
      "./data/fandex-cloud-v10/state/music_chart_check_history_v1_latest.json",
      "./data/fandex-cloud-v10/state/music_chart_artist_candidates_v2_raw_latest.json",
      "./data/fandex-cloud-v10/state/music_chart_bugs_all_targets_v1_latest.json",
      "./data/fandex-cloud-v10/state/music_chart_check_history_v1.csv",
      "./data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl",
      "./data/momentum-product/iu_momentum_live_shadow_source_currentness_audit_v1.json",
      "./data/lastfm-cloud/lastfm_cloud_status_latest.json",
    ],
  },
};

export default nextConfig;
