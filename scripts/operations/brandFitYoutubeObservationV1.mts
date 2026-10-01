import {
  executeBrandFitYouTubeObservation,
  sanitizeBrandFitYouTubeManualExecutionResult,
} from '../../lib/intelligence/brandFitYouTubeManualExecution';
import {
  validateBrandFitProductionObservationReceipt,
} from '../../lib/intelligence/brandFitProductionObservationReceipt';

const EXECUTION_FLAG = '--execute';
const METADATA_POLICY_APPROVAL =
  'approved-brand-fit-youtube-metadata-policy-v1';
const DISCLOSURE_APPROVAL =
  'approved-brand-fit-youtube-disclosure-v1';

function fail(reason: string): never {
  process.stderr.write(
    JSON.stringify({
      status: 'blocked',
      command: 'brand-fit-youtube-observation-v1',
      reason,
      databaseWritePerformed: false,
      productActivationPerformed: false,
    }) + '\n',
  );
  process.exit(1);
}

if (
  process.argv.length !== 3
  || process.argv[2] !== EXECUTION_FLAG
) {
  fail('explicit-execute-flag-required');
}

const apiKey = process.env.FANDEX_BRAND_FIT_YOUTUBE_API_KEY ?? '';
if (apiKey.length === 0) {
  fail('youtube-api-key-missing');
}

if (
  process.env.FANDEX_BRAND_FIT_YOUTUBE_METADATA_POLICY_APPROVED
    !== METADATA_POLICY_APPROVAL
) {
  fail('metadata-policy-approval-missing');
}

if (
  process.env.FANDEX_BRAND_FIT_YOUTUBE_DISCLOSURE_READY
    !== DISCLOSURE_APPROVAL
) {
  fail('terms-privacy-disclosure-approval-missing');
}

const result = await executeBrandFitYouTubeObservation({
  apiKey,
  compliance: {
    usesYouTubeDataApiOnly: true,
    scrapingDisabled: true,
    audiovisualDownloadDisabled: true,
    nonAuthorizedMetadataRefreshWithin30Days: true,
    latestMetadataRefreshEnabled: true,
    termsAndPrivacyDisclosureReady: true,
    officialBrandChannelBindingRequired: true,
    numericDerivedMetricDisabled: true,
  },
});

const sanitized = sanitizeBrandFitYouTubeManualExecutionResult(result);

if (result.status !== 'eligible-for-stored-evidence-review') {
  process.stdout.write(JSON.stringify(sanitized, null, 2) + '\n');
  process.exit(1);
}

const receipt = validateBrandFitProductionObservationReceipt(
  JSON.stringify(sanitized),
);
if (receipt.status !== 'accepted-receipt') {
  fail('sanitized-receipt-validation-failed');
}

process.stdout.write(JSON.stringify(sanitized, null, 2) + '\n');
