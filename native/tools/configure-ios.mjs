import { readFileSync, writeFileSync } from 'node:fs';
import plist from 'plist';
import xcode from 'xcode';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const root = 'ios/App/App/';
const info = plist.parse(readFileSync(root + 'Info.plist', 'utf8'));
info.CFBundleLocalizations = ['en', 'es'];
info.CFBundleURLTypes = [
  {
    CFBundleURLName: 'Amparo sign-in',
    CFBundleURLSchemes: ['com.amparoaccess.app'],
  },
];
info.AmparoAuthHost = 'kipnzxueazppkbgpxckz.supabase.co';
info.ITSAppUsesNonExemptEncryption = false;
info.NSCameraUsageDescription =
  'Add a photo to the family report draft you are preparing. Photos stay in the preview until you choose to remove them or close it.';
info.NSPhotoLibraryUsageDescription =
  'Choose a photo for your family report draft. Amparo uses only the photos you select.';
delete info.UIRequiredDeviceCapabilities;
writeFileSync(root + 'Info.plist', plist.build(info) + '\n');
writeFileSync(
  root + 'Amparo.entitlements',
  plist.build({ 'com.apple.developer.applesignin': ['Default'] }) + '\n',
);
writeFileSync(
  root + 'PrivacyInfo.xcprivacy',
  plist.build({
    NSPrivacyTracking: false,
    NSPrivacyTrackingDomains: [],
    NSPrivacyAccessedAPITypes: [],
    NSPrivacyCollectedDataTypes: [
      'NSPrivacyCollectedDataTypeEmailAddress',
      'NSPrivacyCollectedDataTypeUserID',
    ].map((type) => ({
      NSPrivacyCollectedDataType: type,
      NSPrivacyCollectedDataTypeLinked: true,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: [
        'NSPrivacyCollectedDataTypePurposeAppFunctionality',
      ],
    })),
  }) + '\n',
);
const main = root + 'Base.lproj/Main.storyboard';
writeFileSync(
  main,
  readFileSync(main, 'utf8').replace(
    'customClass="CAPBridgeViewController" customModule="Capacitor"',
    'customClass="AmparoViewController" customModule="App"',
  ),
);
const icon = new Resvg(readFileSync('public/favicon.svg', 'utf8'), {
  fitTo: { mode: 'width', value: 1024 },
  background: '#171b1a',
})
  .render()
  .asPng();
writeFileSync(
  root + 'Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  await sharp(icon).removeAlpha().png().toBuffer(),
);
const splash = new Resvg(
  '<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="#171b1a"/><g transform="translate(1174 1174) scale(8)">' +
    readFileSync('public/favicon.svg', 'utf8')
      .slice(readFileSync('public/favicon.svg', 'utf8').indexOf('>') + 1)
      .replace('</svg>', '</g></svg>'),
)
  .render()
  .asPng();
for (const name of [
  'splash-2732x2732.png',
  'splash-2732x2732-1.png',
  'splash-2732x2732-2.png',
])
  writeFileSync(root + 'Assets.xcassets/Splash.imageset/' + name, splash);
const project = xcode.project('ios/App/App.xcodeproj/project.pbxproj');
project.parseSync();
const group = project.findPBXGroupKey({ path: 'App' });
for (const source of [
  'AmparoViewController.swift',
  'AmparoKeychain.swift',
  'AmparoAppleAuthorization.swift',
  'AmparoNativePlugin.swift',
]) {
  if (!project.hasFile(source)) project.addSourceFile(source, {}, group);
}
if (!project.hasFile('PrivacyInfo.xcprivacy')) {
  const resource = project.addFile('PrivacyInfo.xcprivacy', group);
  resource.uuid = project.generateUuid();
  project.addToPbxBuildFileSection(resource);
  project.addToPbxResourcesBuildPhase(resource);
}
const configs = project.pbxXCBuildConfigurationSection();
for (const value of Object.values(configs)) {
  if (!value.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER) continue;
  value.buildSettings.CODE_SIGN_ENTITLEMENTS = 'App/Amparo.entitlements';
  value.buildSettings.MARKETING_VERSION = '"1.0.0"';
  value.buildSettings.CURRENT_PROJECT_VERSION = '1';
  value.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '15.0';
  value.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
}
writeFileSync('ios/App/App.xcodeproj/project.pbxproj', project.writeSync());
console.log(
  'Configured iPhone/iPad project, native bridge, branding and privacy manifest.',
);
