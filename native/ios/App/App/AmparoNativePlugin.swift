import Capacitor
import AuthenticationServices
import SafariServices
import UserNotifications
import UIKit

@objc(AmparoNativePlugin)
public class AmparoNativePlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "AmparoNativePlugin"
    public let jsName = "AmparoNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "readSecret", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeSecret", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeSecret", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "apple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appearance", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remind", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelReminder", returnType: CAPPluginReturnPromise)
    ]
    private var webSession: ASWebAuthenticationSession?
    private var appleSession: AmparoAppleAuthorization?
    private var authWindow: ASPresentationAnchor?
    @objc func readSecret(_ call: CAPPluginCall) {
        guard let key = secretKey(call) else { return }
        do { call.resolve(["value": try AmparoKeychain.read(key) as Any? ?? NSNull()]) }
        catch { call.reject("Secure storage is unavailable", "KEYCHAIN_UNAVAILABLE") }
    }
    @objc func writeSecret(_ call: CAPPluginCall) {
        guard let key = secretKey(call), let value = call.getString("value"), value.utf8.count <= 65536 else {
            call.reject("Invalid secure storage request", "INVALID_INPUT"); return
        }
        do { try AmparoKeychain.write(key, value); call.resolve() }
        catch { call.reject("Secure storage is unavailable", "KEYCHAIN_UNAVAILABLE") }
    }
    @objc func removeSecret(_ call: CAPPluginCall) {
        guard let key = secretKey(call) else { return }
        do { try AmparoKeychain.remove(key); call.resolve() }
        catch { call.reject("Secure storage is unavailable", "KEYCHAIN_UNAVAILABLE") }
    }
    private func secretKey(_ call: CAPPluginCall) -> String? {
        guard let key = call.getString("key"), !key.isEmpty, key.utf8.count <= 256 else {
            call.reject("Invalid secure storage key", "INVALID_INPUT"); return nil
        }
        return key
    }
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        authWindow ?? ASPresentationAnchor()
    }
    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.webSession == nil, self.appleSession == nil,
                  let raw = call.getString("url"), let url = URL(string: raw),
                  url.scheme == "https", url.user == nil, url.password == nil,
                  url.host == Bundle.main.object(forInfoDictionaryKey: "AmparoAuthHost") as? String,
                  url.path == "/auth/v1/authorize",
                  let window = self.bridge?.viewController?.view.window else {
                call.reject("Sign-in is unavailable", "INVALID_AUTH_REQUEST"); return
            }
            self.authWindow = window
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "com.amparoaccess.app") { [weak self] callback, _ in
                self?.webSession = nil
                self?.authWindow = nil
                guard let callback = callback else { call.reject("Sign-in cancelled", "AUTH_CANCELLED"); return }
                call.resolve(["url": callback.absoluteString])
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            self.webSession = session
            if !session.start() { self.webSession = nil; call.reject("Could not open sign-in", "UNAVAILABLE") }
        }
    }
    @objc func apple(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.appleSession == nil, self.webSession == nil,
                  let window = self.bridge?.viewController?.view.window else {
                call.reject("Sign-in is unavailable", "UNAVAILABLE"); return
            }
            self.appleSession = AmparoAppleAuthorization(call: call, window: window) { [weak self] in
                self?.appleSession = nil
            }
            self.appleSession?.start()
        }
    }
    @objc func openLink(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let raw = call.getString("url"), let url = URL(string: raw),
                  url.scheme == "https", url.user == nil, url.password == nil,
                  let controller = self.bridge?.viewController else {
                call.reject("Invalid link", "INVALID_INPUT"); return
            }
            controller.present(SFSafariViewController(url: url), animated: true) { call.resolve() }
        }
    }
    @objc func appearance(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let theme = call.getString("theme"), ["dark", "light"].contains(theme),
                  let controller = self.bridge?.viewController as? CAPBridgeViewController else {
                call.reject("Invalid appearance", "INVALID_INPUT"); return
            }
            controller.overrideUserInterfaceStyle = theme == "dark" ? .dark : .light
            controller.statusBarStyle = theme == "dark" ? .lightContent : .darkContent
            controller.setNeedsStatusBarAppearanceUpdate()
            call.resolve()
        }
    }
    @objc func share(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let text = call.getString("text"), !text.isEmpty, text.utf8.count <= 65536,
                  let controller = self.bridge?.viewController else {
                call.reject("Invalid sharing request", "INVALID_INPUT"); return
            }
            let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = controller.view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: controller.view.bounds.midX, y: controller.view.bounds.midY, width: 1, height: 1)
            sheet.completionWithItemsHandler = { _, completed, _, _ in call.resolve(["completed": completed]) }
            controller.present(sheet, animated: true)
        }
    }
    @objc func remind(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted else { call.reject("Notifications are not allowed", "PERMISSION_DENIED"); return }
            let content = UNMutableNotificationContent()
            let spanish = call.getString("language") == "es"
            content.title = "Amparo"
            content.body = spanish ? "Revisa tu lista de preparación cuando te convenga." : "Take a moment to review your preparation checklist."
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 86400, repeats: false)
            center.add(UNNotificationRequest(identifier: "amparo.preparation", content: content, trigger: trigger)) { error in
                if error != nil { call.reject("Could not schedule reminder", "UNAVAILABLE") }
                else { call.resolve(["scheduled": true]) }
            }
        }
    }
    @objc func cancelReminder(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["amparo.preparation"])
        center.removeDeliveredNotifications(withIdentifiers: ["amparo.preparation"])
        call.resolve()
    }
}
