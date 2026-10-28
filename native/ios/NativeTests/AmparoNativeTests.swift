import XCTest
import UIKit
import Capacitor
@testable import App

final class AmparoNativeTests: XCTestCase {
    @MainActor
    func testSceneUsesOneCustomBridgeWithNativePlugin() throws {
        let windows = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .filter { $0.rootViewController is CAPBridgeViewController }
        XCTAssertEqual(windows.count, 1, "Launch must create one Capacitor window")
        let controller = try XCTUnwrap(windows.first?.rootViewController as? AmparoViewController)
        controller.loadViewIfNeeded()
        XCTAssertTrue(controller.bridge?.plugin(withName: "AmparoNative") is AmparoNativePlugin)
    }
    func testKeychainRoundTripUpdateAndRemoval() throws {
        let key = "test." + UUID().uuidString
        defer { try? AmparoKeychain.remove(key) }
        XCTAssertNil(try AmparoKeychain.read(key))
        try AmparoKeychain.write(key, "fixture-session")
        XCTAssertEqual(try AmparoKeychain.read(key), "fixture-session")
        try AmparoKeychain.write(key, "updated-session")
        XCTAssertEqual(try AmparoKeychain.read(key), "updated-session")
        try AmparoKeychain.remove(key)
        XCTAssertNil(try AmparoKeychain.read(key))
    }
}
