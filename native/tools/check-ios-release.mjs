import { readFile, writeFile } from 'node:fs/promises';
const profile = JSON.parse(
  await readFile('mobile/store/submission.json', 'utf8'),
);
const missing = [];
for (const name of [
  'appleTeamId',
  'appStoreConnectId',
  'finalWebsiteUrl',
  'supportUrl',
  'privacyUrl',
  'supportEmail',
]) {
  if (typeof profile[name] !== 'string' || !profile[name].trim())
    missing.push(name);
}
for (const name of [
  'signingConfigured',
  'appleSignInVerified',
  'nativeGoogleCallbackVerified',
  'accountDeletionDeployedAndVerified',
  'emailDeliveryVerified',
  'productionFeaturesVerified',
  'physicalDeviceAcceptancePassed',
  'accessibilityReviewPassed',
  'privacyAnswersReviewed',
  'ageRatingCompleted',
  'reviewerAccessPrepared',
  'businessOwnershipVerified',
  'storeScreenshotsApproved',
]) {
  if (profile[name] !== true) missing.push(name);
}
for (const name of ['finalWebsiteUrl', 'supportUrl', 'privacyUrl']) {
  if (!profile[name]) continue;
  try {
    const url = new URL(profile[name]);
    if (
      url.protocol !== 'https:' ||
      url.hostname.endsWith('.github.io') ||
      url.username ||
      url.password
    )
      missing.push(name + ': requires final business HTTPS URL');
  } catch {
    missing.push(name + ': invalid URL');
  }
}
const result = {
  checkedAt: new Date().toISOString(),
  readyForSubmission: missing.length === 0,
  missing,
  note: 'This validates declared release inputs; Apple review and signed-device proof remain authoritative.',
};
await writeFile(
  'evidence/ios-release-gate.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
process.exitCode = missing.length ? 1 : 0;
