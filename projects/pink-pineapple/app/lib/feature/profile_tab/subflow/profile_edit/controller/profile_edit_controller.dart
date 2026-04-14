import 'dart:convert';
import 'dart:developer';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:logger/logger.dart';

import '../../../../../core/const/country_list.dart';
import '../../../../../core/const/user_info/user_info_controller.dart';
import '../../../../../core/global_widgets/app_snackbar.dart';
import '../../../../../core/local/local_data.dart';
import '../../../../../core/network_caller/endpoints.dart';

class ProfileEditController extends GetxController {
  final userInfo = Get.find<UserInfoController>();
  final logger = Logger();

  final ImagePicker _picker = ImagePicker();

  // -------- Files --------
  // multipart key: "profile" => profile image
  final profileFile = Rxn<File>();

  final profileImageUrl = ''.obs;

  final isLoading = false.obs;

  // -------- Text fields --------
  final fullName = TextEditingController();
  final userName = TextEditingController();
  final fullAddress = TextEditingController();
  final bio = TextEditingController();
  final phoneNumber = TextEditingController();

  final selectedDOB = Rxn<DateTime>();

  // phone country code
  final RxString selectedCountryCode = '+44'.obs;
  final RxString selectedCountryFlag = '🇬🇧'.obs;

  String getFlagByCode(String code) {
    return countryList.firstWhere(
          (c) => c['code'] == code,
      orElse: () => {'icon': '🌍'},
    )['icon']!;
  }

  String get dobText {
    if (selectedDOB.value == null) return '';
    final d = selectedDOB.value!;
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    final yy = (d.year % 100).toString().padLeft(2, '0');
    return '$dd/$mm/$yy';
  }

  // unique country list (dedup by code)
  List<Map<String, String>> get uniqueCountryByCode {
    final seen = <String>{};
    final out = <Map<String, String>>[];
    for (final c in countryList) {
      final code = c['code'] ?? '';
      if (code.isEmpty || seen.contains(code)) continue;
      seen.add(code);
      out.add(c);
    }
    if (out.isNotEmpty &&
        !out.any((e) => e['code'] == selectedCountryCode.value)) {
      selectedCountryCode.value = out.first['code']!;
      selectedCountryFlag.value = getFlagByCode(selectedCountryCode.value);
    }
    return out;
  }

  // -------- Pickers --------
  Future<void> pickProfileFromCamera() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1800,
        maxHeight: 1800,
        imageQuality: 85,
      );
      if (image != null) {
        profileFile.value = File(image.path);
        try {
          final s = profileFile.value!.lengthSync();
          logger.d('Picked profile image from camera: path=${image.path}, size=${s} bytes');
        } catch (e) {
          logger.d('Picked profile image from camera: path=${image.path} (size unknown)');
        }
      }
    } catch (e) {
      log("pick profile camera error: $e");
    }
  }

  Future<void> pickProfileFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1800,
        maxHeight: 1800,
        imageQuality: 85,
      );
      if (image != null) {
        profileFile.value = File(image.path);
        try {
          final s = profileFile.value!.lengthSync();
          logger.d('Picked profile image from gallery: path=${image.path}, size=${s} bytes');
        } catch (e) {
          logger.d('Picked profile image from gallery: path=${image.path} (size unknown)');
        }
      }
    } catch (e) {
      log("pick profile gallery error: $e");
    }
  }

  void removeProfile() => profileFile.value = null;

  // -------- Init --------
  @override
  void onReady() {
    super.onReady();

    final u = userInfo.userInfo.value?.userProfile;
    if (u == null) {
      logger.w('⚠️ UserProfile is null in onReady, cannot load existing data');
      return;
    }

    // Load text fields
    fullName.text = (u.fullName ?? '').trim();
    userName.text = (u.username ?? '').trim();
    fullAddress.text = (u.fullAddress ?? '').trim();
    bio.text = (u.bio ?? '').trim();
    profileImageUrl.value = (u.profileImage ?? '').trim();

    // Load DOB from server
    if (u.dob != null) {
      selectedDOB.value = u.dob;
      logger.d('📅 Loaded DOB from server: ${u.dob}');
    }

    // phone parse (best-effort)
    final phone = (u.phoneNumber ?? '').trim();
    if (phone.startsWith('+')) {
      final code = countryList
          .map((e) => e['code'])
          .firstWhere((c) => phone.startsWith(c!), orElse: () => '+44')!;
      selectedCountryCode.value = code;
      selectedCountryFlag.value = getFlagByCode(code);
      phoneNumber.text = phone.replaceFirst(code, '').trim();
      logger.d('📞 Loaded phone: $code ${phoneNumber.text}');
    } else if (phone.isNotEmpty) {
      phoneNumber.text = phone;
      logger.d('📞 Loaded phone (no country code): $phone');
    }

    logger.d('✅ Profile data loaded successfully');
  }

  Map<String, dynamic> _buildDataPayload() {
    // Log what we're reading from UI fields FIRST
    logger.i('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.i('📝 READING VALUES FROM UI FIELDS:');
    logger.i('   fullName field: "${fullName.text}"');
    logger.i('   userName field: "${userName.text}"');
    logger.i('   fullAddress field: "${fullAddress.text}"');
    logger.i('   bio field: "${bio.text}"');
    logger.i('   phoneNumber field: "${phoneNumber.text}"');
    logger.i('   selectedCountryCode: "${selectedCountryCode.value}"');
    logger.i('   selectedDOB: ${selectedDOB.value}');
    logger.i('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    final payload = <String, dynamic>{};

    // Always include these fields (backend may need them even if empty)
    payload['fullName'] = fullName.text.trim();
    payload['username'] = userName.text.trim();
    payload['fullAddress'] = fullAddress.text.trim();
    payload['bio'] = bio.text.trim();

    // Date: always include if set
    if (selectedDOB.value != null) {
      payload['dob'] = selectedDOB.value!.toIso8601String();
    }

    // Phone: always include if there's a local number
    final local = phoneNumber.text.trim();
    if (local.isNotEmpty) {
      payload['phoneNumber'] = '${selectedCountryCode.value}$local';
    }

    logger.i('📦 PAYLOAD TO SEND:');
    logger.i(jsonEncode(payload));
    logger.i('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return payload;
  }

  // -------- Multipart update (data + profile + license) --------
  // Future<bool> saveAllMultipart() async {
  //   isLoading.value = true;
  //
  //   try {
  //     final token = await LocalService().getValue<String>(PreferenceKey.token);
  //     if (token == null || token.isEmpty) throw Exception("Auth token missing");
  //
  //     final url = Urls.updateUser; // your endpoint
  //     final uri = Uri.parse(url);
  //
  //     final dataPayload = _buildDataPayload();
  //
  //     final hasFiles = profileFile.value != null;
  //     final hasData = dataPayload.isNotEmpty;
  //
  //     if (!hasFiles && !hasData) {
  //       AppSnackbar.show(message: "Nothing to update", isSuccess: false);
  //       return true;
  //     }
  //
  //     final req = http.MultipartRequest('PUT', uri); // change to PATCH if needed
  //     req.headers.addAll({
  //       'Accept': 'application/json',
  //       'Authorization': '$token',
  //     });
  //
  //     // Log what's being sent (mask token)
  //     logger.i('');
  //     logger.i('🚀 ═══════════════════════════════════════');
  //     logger.i('🚀 SENDING MULTIPART REQUEST');
  //     logger.i('🚀 ═══════════════════════════════════════');
  //     logger.i('📍 URL: $url');
  //     logger.i('📍 Method: PUT');
  //     logger.i('🔑 Auth token (masked): ${_maskToken(token)}');
  //
  //     // Add data fields individually so backend (and Prisma) receive top-level keys
  //     // Many Prisma-backed endpoints expect top-level form fields rather than a single JSON field.
  //     if (dataPayload.isNotEmpty) {
  //       final mapped = dataPayload.map((key, value) => MapEntry(key, value == null ? '' : value.toString()));
  //       req.fields.addAll(mapped);
  //     }
  //
  //     // FILE PART: key "profile"
  //     if (profileFile.value != null) {
  //       final File f = profileFile.value!;
  //       try {
  //         final fileLen = f.lengthSync();
  //         logger.d('Adding file to request -> field: profile, path: ${f.path}, size: ${fileLen} bytes');
  //       } catch (e) {
  //         logger.d('Adding file to request -> field: profile, path: ${f.path} (size unknown)');
  //       }
  //
  //       req.files.add(
  //         await http.MultipartFile.fromPath(
  //           'profile',
  //           profileFile.value!.path,
  //           filename:
  //           'profile_${DateTime.now().millisecondsSinceEpoch}${_ext(profileFile.value!.path)}',
  //         ),
  //       );
  //     }
  //
  //
  //     logger.i('');
  //     logger.i('📤 FINAL MULTIPART FIELDS BEING SENT:');
  //     logger.i('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //     req.fields.forEach((key, value) {
  //       logger.i('   $key = "$value"');
  //     });
  //     logger.i('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //     logger.i('');
  //     logger.i('📎 FILES: ${req.files.length} file(s)');
  //     if (req.files.isNotEmpty) {
  //       for (var f in req.files) {
  //         logger.i('   - Field: "${f.field}", Filename: "${f.filename}"');
  //       }
  //     }
  //     logger.i('🚀 ═══════════════════════════════════════');
  //     logger.i('');
  //
  //     logger.i('⏳ Sending request...');
  //     final streamed = await req.send();
  //     final res = await http.Response.fromStream(streamed);
  //
  //     logger.i('');
  //     logger.i('📥 ═══════════════════════════════════════');
  //     logger.i('📥 RESPONSE RECEIVED');
  //     logger.i('📥 ═══════════════════════════════════════');
  //     logger.i('📊 HTTP Status: ${res.statusCode}');
  //     logger.i('📄 Response Body:');
  //     logger.i(res.body);
  //     logger.i('📥 ═══════════════════════════════════════');
  //
  //     final decoded = _safeJson(res.body);
  //
  //     logger.i('');
  //     logger.i('🔍 ═══════════════════════════════════════');
  //     logger.i('🔍 PARSING RESPONSE');
  //     logger.i('🔍 ═══════════════════════════════════════');
  //     if (decoded != null) {
  //       logger.i('✓ JSON parsed successfully');
  //       logger.i('   success: ${decoded['success']}');
  //       logger.i('   message: "${decoded['message']}"');
  //       if (decoded['data'] != null) {
  //         logger.i('');
  //         logger.i('   📦 Data object received:');
  //         final data = decoded['data'] as Map<String, dynamic>;
  //         data.forEach((key, value) {
  //           logger.i('      $key = $value');
  //         });
  //       } else {
  //         logger.w('   ⚠️ No "data" field in response');
  //       }
  //     } else {
  //       logger.e('   ✗ Failed to parse JSON response');
  //     }
  //     logger.i('🔍 ═══════════════════════════════════════');
  //     logger.i('');
  //
  //     if (res.statusCode >= 200 && res.statusCode < 300) {
  //       if (decoded != null && decoded['success'] == true) {
  //         logger.w('');
  //         logger.w('✅ ═══════════════════════════════════════');
  //         logger.w('✅ SUCCESS - Server accepted changes');
  //         logger.w('✅ ═══════════════════════════════════════');
  //
  //         // NOTE: Backend only returns {"updatedAt": "..."} in data, NOT the actual updated fields.
  //         // So we DON'T try to update from server response - the text controllers already have the correct values!
  //         // We just need to refresh the global user info so other screens see the changes.
  //
  //         logger.w('ℹ️  Backend response data only contains: ${decoded['data']?.keys?.toList()}');
  //         logger.w('ℹ️  Text controllers already have correct values - no local update needed');
  //         logger.w('ℹ️  Current local values:');
  //         logger.w('   fullName: "${fullName.text}"');
  //         logger.w('   username: "${userName.text}"');
  //         logger.w('   fullAddress: "${fullAddress.text}"');
  //         logger.w('   bio: "${bio.text}"');
  //         logger.w('   dob: ${selectedDOB.value}');
  //         logger.w('   privacy: "${privacy.value}"');
  //         logger.w('✅ ═══════════════════════════════════════');
  //         logger.w('');
  //
  //         // Fetch fresh user info to update global state (this will get the real updated data from server)
  //         logger.i('🔄 Refreshing global user info...');
  //         await userInfo.fetchUserInfo();
  //         logger.i('✓ Global user info refreshed');
  //
  //         // Clear file selections
  //         profileFile.value = null;
  //
  //         AppSnackbar.show(
  //           message: decoded['message'] ?? 'Profile updated',
  //           isSuccess: true,
  //           topOffset: 4.0,
  //         );
  //         return true;
  //       }
  //
  //       // If backend doesn't use "success", still treat 2xx as ok
  //       await userInfo.fetchUserInfo();
  //       AppSnackbar.show(message: 'Profile updated', isSuccess: true, topOffset: 4.0);
  //       return true;
  //     }
  //
  //     // Build a helpful error message including Prisma err details when available
  //     String msg = 'Update failed';
  //     logger.d('🔍 building error message from decoded: $decoded');
  //     if (decoded != null) {
  //       if (decoded['message'] != null && (decoded['message'] as String).isNotEmpty) {
  //         msg = decoded['message'];
  //       } else if (decoded['error'] != null && (decoded['error'] is String) && (decoded['error'] as String).isNotEmpty) {
  //         msg = decoded['error'];
  //       } else if (decoded['err'] != null) {
  //         try {
  //           final errObj = decoded['err'];
  //           if (errObj is Map<String, dynamic>) {
  //             // Include name/clientVersion or any message present
  //             final name = errObj['name'] ?? '';
  //             final cv = errObj['clientVersion'] ?? '';
  //             final errMsg = errObj['message'] ?? errObj['meta'] ?? '';
  //             msg = 'Server validation error: ${name}${cv != '' ? ' ($cv)' : ''}${errMsg != '' ? ': $errMsg' : ''}';
  //           } else {
  //             msg = 'Server error: ${errObj.toString()}';
  //           }
  //         } catch (_) {
  //           msg = 'Server validation error';
  //         }
  //       }
  //     }
  //     throw Exception(msg);
  //   } catch (e) {
  //     logger.e('Save multipart failed: $e');
  //     AppSnackbar.show(message: e.toString(), isSuccess: false);
  //     return false;
  //   } finally {
  //     isLoading.value = false;
  //   }
  // }

  // -------- Multipart update (data + profile + license) --------
  Future<bool> saveAllMultipart() async {
    isLoading.value = true;

    try {
      final token = await LocalService().getValue<String>(PreferenceKey.token);
      if (token == null || token.isEmpty) throw Exception("Auth token missing");

      final url = Urls.updateUser;
      final uri = Uri.parse(url);
      final dataPayload = _buildDataPayload();

      final hasFiles = profileFile.value != null;
      final hasData = dataPayload.isNotEmpty;

      if (!hasFiles && !hasData) {
        AppSnackbar.show(message: "Nothing to update", isSuccess: false);
        return true;
      }

      final req = http.MultipartRequest('PUT', uri);
      req.headers.addAll({
        'Accept': 'application/json',
        'Authorization': '$token',
      });

      logger.i('');
      logger.i('🚀 ═══════════════════════════════════════');
      logger.i('🚀 SENDING MULTIPART REQUEST');
      logger.i('🚀 ═══════════════════════════════════════');
      logger.i('📍 URL: $url');
      logger.i('📍 Method: PUT');
      logger.i('🔑 Auth token (masked): ${_maskToken(token)}');

      // ✅ FIX: Send as a single "data" field containing JSON
      if (dataPayload.isNotEmpty) {
        req.fields['data'] = jsonEncode(dataPayload);
        logger.i('📦 DATA FIELD: ${req.fields['data']}');
      }

      // Add file if present
      if (profileFile.value != null) {
        final File f = profileFile.value!;
        try {
          final fileLen = f.lengthSync();
          logger.d('Adding file: ${f.path}, size: $fileLen bytes');
        } catch (e) {
          logger.d('Adding file: ${f.path} (size unknown)');
        }

        req.files.add(
          await http.MultipartFile.fromPath(
            'profile',
            f.path,
            filename: 'profile_${DateTime.now().millisecondsSinceEpoch}${_ext(f.path)}',
          ),
        );
      }

      logger.i('');
      logger.i('📤 FINAL MULTIPART FIELDS:');
      logger.i('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      req.fields.forEach((key, value) {
        logger.i('   $key = "$value"');
      });
      logger.i('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.i('');
      logger.i('📎 FILES: ${req.files.length} file(s)');
      if (req.files.isNotEmpty) {
        for (var f in req.files) {
          logger.i('   - Field: "${f.field}", Filename: "${f.filename}"');
        }
      }
      logger.i('🚀 ═══════════════════════════════════════');
      logger.i('');

      logger.i('⏳ Sending request...');

      http.Response res;
      try {
        final streamed = await req.send();
        res = await http.Response.fromStream(streamed);
      } catch (e) {
        logger.e('❌ Request failed: $e');
        throw Exception('Failed to send request: $e');
      }

      logger.i('');
      logger.i('📥 ═══════════════════════════════════════');
      logger.i('📥 RESPONSE RECEIVED');
      logger.i('📥 ═══════════════════════════════════════');
      logger.i('📊 HTTP Status: ${res.statusCode}');
      logger.i('📄 Response Body:');
      logger.i(res.body);
      logger.i('📥 ═══════════════════════════════════════');

      final decoded = _safeJson(res.body);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (decoded != null && decoded['success'] == true) {
          logger.w('✅ SUCCESS - Server accepted changes');

          // Wait before fetching
          logger.i('⏱️ Waiting 1 second before fetching updated data...');
          await Future.delayed(Duration(seconds: 1));

          // Fetch fresh user info
          logger.i('🔄 Refreshing global user info...');
          await userInfo.fetchUserInfo();

          // Compare
          final freshData = userInfo.userInfo.value?.userProfile;
          logger.e('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          logger.e('🔍 COMPARISON - SENT vs RECEIVED:');
          logger.e('   fullName sent: "${dataPayload['fullName']}" | received: "${freshData?.fullName}"');
          logger.e('   bio sent: "${dataPayload['bio']}" | received: "${freshData?.bio}"');
          logger.e('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // Check if data actually updated
          bool dataMatches = true;
          if (dataPayload.containsKey('fullName')) {
            dataMatches = dataMatches && freshData?.fullName == dataPayload['fullName'];
          }
          if (dataPayload.containsKey('bio')) {
            dataMatches = dataMatches && freshData?.bio == dataPayload['bio'];
          }

          if (!dataMatches) {
            logger.e('❌ SERVER DID NOT SAVE THE DATA!');
            logger.e('This is a backend issue - contact your backend team');
            AppSnackbar.show(
              message: 'Update failed - server did not save changes',
              isSuccess: false,
            );
            return false;
          }

          logger.i('✓ Data verified - update successful!');

          // Clear file selections
          profileFile.value = null;

          AppSnackbar.show(
            message: decoded['message'] ?? 'Profile updated',
            isSuccess: true,
            topOffset: 4.0,
          );
          return true;
        }

        await userInfo.fetchUserInfo();
        AppSnackbar.show(message: 'Profile updated', isSuccess: true, topOffset: 4.0);
        return true;
      }

      // Build error message
      String msg = 'Update failed';
      if (decoded != null) {
        if (decoded['message'] != null && (decoded['message'] as String).isNotEmpty) {
          msg = decoded['message'];
        }
      }
      throw Exception(msg);
    } catch (e) {
      logger.e('❌ Save multipart failed: $e');
      AppSnackbar.show(message: e.toString(), isSuccess: false);
      return false;
    } finally {
      isLoading.value = false;
    }
  }


  Future<void> saveAndClose(BuildContext context) async {
    final ok = await saveAllMultipart();
    if (ok) Navigator.pop(context);
  }

  @override
  void onClose() {
    fullName.dispose();
    userName.dispose();
    fullAddress.dispose();
    bio.dispose();
    phoneNumber.dispose();
    super.onClose();
  }

  static Map<String, dynamic>? _safeJson(String body) {
    try {
      final v = jsonDecode(body);
      if (v is Map<String, dynamic>) return v;
      return null;
    } catch (_) {
      return null;
    }
  }

  static String _ext(String path) {
    final dot = path.lastIndexOf('.');
    if (dot == -1) return '';
    return path.substring(dot);
  }

  // Helper to mask token for logs
  String _maskToken(String? t) {
    if (t == null) return 'null';
    try {
      if (t.length <= 8) return '***';
      return '${t.substring(0, 4)}...${t.substring(t.length - 4)}';
    } catch (_) {
      return '***';
    }
  }
}
