import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const run = (command, args) =>
  execFileSync(command, args, { stdio: 'inherit' });
mkdirSync('artifacts', { recursive: true });
const devices = JSON.parse(
  execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], {
    encoding: 'utf8',
  }),
).devices;
const phone = Object.entries(devices)
  .filter(([runtime]) => runtime.includes('iOS'))
  .reverse()
  .flatMap(([, list]) => list)
  .find((device) => device.isAvailable && device.name.includes('iPhone'));
if (!phone) throw new Error('No iPhone simulator is available');
writeFileSync('artifacts/device.json', JSON.stringify(phone, null, 2));
const base = ['-project', 'ios/App/App.xcodeproj', '-scheme', 'Amparo'];
run('xcodebuild', [
  ...base,
  'CODE_SIGNING_ALLOWED=NO',
  '-destination',
  'generic/platform=iOS',
  '-archivePath',
  'artifacts/Amparo-unsigned.xcarchive',
  'archive',
]);
run('ditto', [
  '-c',
  '-k',
  '--sequesterRsrc',
  '--keepParent',
  'artifacts/Amparo-unsigned.xcarchive',
  'artifacts/Amparo-unsigned.xcarchive.zip',
]);
try {
  run('xcodebuild', [
    ...base,
    'CODE_SIGNING_ALLOWED=YES',
    'CODE_SIGNING_REQUIRED=YES',
    'CODE_SIGN_IDENTITY=-',
    '-destination',
    'platform=iOS Simulator,id=' + phone.udid,
    '-test-timeouts-enabled',
    'YES',
    '-maximum-test-execution-time-allowance',
    '180',
    '-resultBundlePath',
    'artifacts/Amparo-tests.xcresult',
    '-derivedDataPath',
    'ios/DerivedData',
    'test',
  ]);
} finally {
  try {
    run('xcrun', [
      'xcresulttool',
      'export',
      'attachments',
      '--path',
      'artifacts/Amparo-tests.xcresult',
      '--output-path',
      'artifacts/screenshots',
    ]);
  } catch {
    console.error(
      'Screenshot export unavailable; inspect the xcresult bundle.',
    );
  }
}
