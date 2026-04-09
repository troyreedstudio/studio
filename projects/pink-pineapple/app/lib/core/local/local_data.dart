import 'package:shared_preferences/shared_preferences.dart';

enum PreferenceKey {
  token('token'),
  name('user_name'),
  email('user_email'),
  userId('userId'),
  age('age'),
  role('role'),
  imagePath('user_image_path'),
  onboard('onboard');

  final String key;
  const PreferenceKey(this.key);
}

class LocalService {
  // Generic setter for String, int, bool, double
  Future<void> setValue<T>(PreferenceKey prefKey, T value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is String) {
      await prefs.setString(prefKey.key, value);
    } else if (value is int) {
      await prefs.setInt(prefKey.key, value);
    } else if (value is bool) {
      await prefs.setBool(prefKey.key, value);
    } else if (value is double) {
      await prefs.setDouble(prefKey.key, value);
    } else {
      throw Exception(
        'Unsupported type for key: ${prefKey.key}. Supported types: String, int, bool, double',
      );
    }
  }

  // Generic getter for String, int, bool, double
  Future<T?> getValue<T>(PreferenceKey prefKey) async {
    final prefs = await SharedPreferences.getInstance();
    if (T == String) {
      return prefs.getString(prefKey.key) as T?;
    } else if (T == int) {
      return prefs.getInt(prefKey.key) as T?;
    } else if (T == bool) {
      return prefs.getBool(prefKey.key) as T?;
    } else if (T == double) {
      return prefs.getDouble(prefKey.key) as T?;
    } else {
      throw Exception(
        'Unsupported type for key: ${prefKey.key}. Supported types: String, int, bool, double',
      );
    }
  }

  // Clear all user data
  Future<void> clearUserData() async {
    final prefs = await SharedPreferences.getInstance();
    for (final prefKey in PreferenceKey.values) {
      await prefs.remove(prefKey.key);
    }
  }
}

/*
Usage Example : 

import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  final localService = LocalService();

  await localService.setValue(PreferenceKey.gender, 'male');
  await localService.setValue(PreferenceKey.old, '30');


  ------------------- Get String values
  String? gender = await localService.getValue<String>(PreferenceKey.gender);

  print('String Examples:');
  print('Gender: $gender'); // Output: Gender: male

  ------------ Example 2: int type 
  await localService.setValue(PreferenceKey.score, 100);
  int? score = await localService.getValue<int>(PreferenceKey.score);

  ---- Example 3: bool type 
  await localService.setValue(PreferenceKey.isLoggedIn, true);
  bool? isLoggedIn = await localService.getValue<bool>(PreferenceKey.isLoggedIn);


  ---- Example 4: double type 
  await localService.setValue(PreferenceKey.rating, 4.5);
  double? rating = await localService.getValue<double>(PreferenceKey.rating);


  await localService.clearUserData();
  print('\nAll data cleared');
}
*/
