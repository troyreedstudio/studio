Pod::Spec.new do |s|
  s.name           = 'LmcBlur'
  s.version        = '1.0.0'
  s.summary        = 'On-device post-record face blur for Let Me Check clips'
  s.description    = 'Local Expo module: blurs faces in a recorded clip before upload (iOS).'
  s.author         = 'Let Me Check'
  s.homepage       = 'https://docs.expo.dev/modules/'
  # Match the app deployment target (app.config.js expo-build-properties ios 15.5).
  s.platforms      = {
    :ios => '15.5'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
