# Amparo iPhone source package

This is a native development preview, not a signed App Store release. It keeps
the existing bilingual app and adds native secure storage, system sign-in
adapters, an offline checklist, sharing and an optional local reminder.

Requires iOS 16 or later. On a Mac with Xcode 26 and Node 22 or later:

```text
npm ci
npm run ios:prepare
npm run ios:open
```

Use the business's Apple Developer team to configure signing. The candidate
bundle identifier is `com.amparoaccess.app`. `submission.json` records the missing
release inputs. `metadata-draft.json` contains draft English/Spanish store copy.
The account provider and deletion flags stay off until backend configuration and
real acceptance checks pass. Existing web Google sign-in remains available.

The `supabase/` sources implement account deletion. Deploy them with business
credentials; no server credential belongs in this package. The native callback
must be allowed in Supabase. Apple sign-in and revocation require the business's
Apple identifiers and server-side key configuration.

An unsigned archive is suitable for developer inspection. Sign and test the
finished app through TestFlight before requesting App Store review. The remaining
family, assistant, appointment and dispatch demo services need production work.


The supported npm commands in the source package are `test` and `ios:*`.
`npm run ios:release-check` currently exits with the missing business inputs;
this is intentional. Do not mark a declaration verified before its acceptance
check actually passes.

Permanent service setup must use the business's ownership, billing, recovery,
and Apple team. Replace the temporary news endpoint in `public/bootstrap.js`,
its origin in `tools/build-ios.mjs`, and the account URL/key/origin in
`public/account/config.js`; match `AmparoAuthHost` in `tools/configure-ios.mjs`
to that final account service. The existing Google Cloud and Supabase projects
must be transferred or replaced with verified access before launch. A custom
website domain alone does not remove the temporary personal-account dependency.

The current version deliberately disables native Apple/Google sign-in and
account deletion until their service configuration and acceptance checks pass.
The controls remain visible with an explanation. Do not enable those flags just
to make the App Store screenshots look complete.
