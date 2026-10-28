import XCTest

final class AmparoUITests: XCTestCase {
    var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        executionTimeAllowance = 180
        app = XCUIApplication()
        app.launch()
        screenshot("launch")
    }
    func screenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    func checklistItem() -> XCUIElement {
        let checkbox = app.checkBoxes["Choose a trusted contact"]
        if checkbox.exists { return checkbox }
        return app.switches["Choose a trusted contact"]
    }
    func openAccountScreen() {
        let account = app.buttons["Menu"].firstMatch
        XCTAssertTrue(account.waitForExistence(timeout: 30))
        account.tap()
    }
    func testLaunchAndOfflineChecklistPersistence() {
        openAccountScreen()
        let first = checklistItem()
        for _ in 0..<5 where !first.isHittable { app.swipeUp() }
        XCTAssertTrue(first.waitForExistence(timeout: 10))
        if first.value as? String != "0" { first.tap() }
        first.tap()
        screenshot("iphone-checklist")
        app.terminate()
        app.launch()
        openAccountScreen()
        let restored = checklistItem()
        for _ in 0..<5 where !restored.isHittable { app.swipeUp() }
        XCTAssertEqual(restored.value as? String, "1")
        app.buttons["Clear checklist"].tap()
        XCTAssertEqual(restored.value as? String, "0")
    }
    func testNativeShareAndAccountOptions() {
        openAccountScreen()
        let share = app.buttons["Share checklist"]
        for _ in 0..<6 where !share.isHittable { app.swipeUp() }
        XCTAssertTrue(share.waitForExistence(timeout: 10))
        share.tap()
        screenshot("native-share")
        XCTAssertTrue(app.otherElements["ActivityListView"].waitForExistence(timeout: 10) || app.buttons["Copy"].exists)
    }
    func testAccountHasAppleAndGoogleOptions() {
        openAccountScreen()
        app.buttons["Account & payment status"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Sign in with Apple"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Continue with Google"].exists)
        screenshot("iphone-sign-in")
    }
    func testHomeAndLanguage() {
        XCTAssertTrue(app.buttons["Menu"].waitForExistence(timeout: 30))
        XCTAssertGreaterThan(app.buttons["ES"].firstMatch.frame.minY, 50)
        screenshot("iphone-home")
        app.buttons["ES"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Menú"].waitForExistence(timeout: 10))
        screenshot("iphone-spanish")
        app.buttons["EN"].firstMatch.tap()
    }
}
