# Amparo iPhone source package

This is a native development preview, not a signed App Store release. It keeps
the existing bilingual app and adds native secure storage, system sign-in
adapters, an offline checklist, sharing and an optional local reminder.

On a Mac with Xcode 26 and Node 22 or later:

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
