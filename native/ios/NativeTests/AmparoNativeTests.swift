import XCTest
@testable import App

final class AmparoNativeTests: XCTestCase {
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
