CREATE TABLE IF NOT EXISTS `regimes` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `lead_body` text NOT NULL,
  `rationale` text NOT NULL,
  `hub_url` text,
  `instrument` text,
  `instrument_url` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jurisdictions` (
  `iso3` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `region` text NOT NULL,
  `kind` text NOT NULL,
  `regime_id` text NOT NULL,
  `parent_iso3` text,
  `activity` text NOT NULL,
  `status` text NOT NULL,
  `authority` text NOT NULL,
  `instrument` text,
  `notes` text NOT NULL,
  `score_clarity` integer NOT NULL CHECK (`score_clarity` BETWEEN 0 AND 100),
  `score_licensing` integer NOT NULL CHECK (`score_licensing` BETWEEN 0 AND 100),
  `score_stablecoin` integer NOT NULL CHECK (`score_stablecoin` BETWEEN 0 AND 100),
  `score_banking` integer NOT NULL CHECK (`score_banking` BETWEEN 0 AND 100),
  `score_tax` integer NOT NULL CHECK (`score_tax` BETWEEN 0 AND 100),
  `score_stability` integer NOT NULL CHECK (`score_stability` BETWEEN 0 AND 100),
  `regulator_site` text,
  `instrument_url` text,
  `verified_by` text,
  `verified_at` text,
  `confidence` text NOT NULL,
  `last_reviewed` text NOT NULL,
  -- verified is all-or-nothing: a date without a name (or vice versa) is a lie
  CHECK ((`verified_by` IS NULL) = (`verified_at` IS NULL)),
  FOREIGN KEY (`regime_id`) REFERENCES `regimes`(`id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jurisdictions_regime` ON `jurisdictions` (`regime_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jurisdictions_parent` ON `jurisdictions` (`parent_iso3`);
