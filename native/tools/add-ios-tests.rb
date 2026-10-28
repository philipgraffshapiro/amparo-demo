require 'xcodeproj'
project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
app = project.targets.find { |target| target.name == 'App' }
target = project.targets.find { |entry| entry.name == 'AmparoUITests' }
unless target
  target = project.new_target(:ui_test_bundle, 'AmparoUITests', :ios, '15.0')
  group = project.main_group.new_group('AmparoUITests', '../UITests')
  target.add_file_references([group.new_file('AmparoUITests.swift')])
  target.add_dependency(app)
end
target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.amparoaccess.app.uitests'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['PRODUCT_NAME'] = 'AmparoUITests'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['TEST_TARGET_NAME'] = 'App'
  config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_test_target(target)
scheme.set_launch_target(app)
scheme.test_action.build_configuration = 'Debug'
scheme.save_as('ios/App/App.xcodeproj', 'Amparo', true)
