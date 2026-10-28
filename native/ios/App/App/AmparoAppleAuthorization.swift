import AuthenticationServices
import CryptoKit
import Capacitor
import Security

final class AmparoAppleAuthorization: NSObject, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {
    private let call: CAPPluginCall
    private let window: ASPresentationAnchor
    private let finish: () -> Void
    private var nonce = ""
    private var state = ""
    init(call: CAPPluginCall, window: ASPresentationAnchor, finish: @escaping () -> Void) {
        self.call = call
        self.window = window
        self.finish = finish
    }
    func start() {
        do {
            nonce = try randomValue()
            state = try randomValue()
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email]
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            request.state = state
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        } catch { call.reject("Could not start Apple sign-in", "UNAVAILABLE"); finish() }
    }
    private func randomValue() throws -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw AmparoKeychain.failure(errSecNotAvailable)
        }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor { window }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { finish() }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              credential.state == state,
              let token = credential.identityToken, let code = credential.authorizationCode,
              let tokenText = String(data: token, encoding: .utf8),
              let codeText = String(data: code, encoding: .utf8) else {
            call.reject("Apple did not return valid credentials", "INVALID_CREDENTIAL"); return
        }
        call.resolve(["identityToken": tokenText, "authorizationCode": codeText, "nonce": nonce])
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        call.reject("Apple sign-in did not complete", "AUTH_CANCELLED")
        finish()
    }
}
