# Free User Feature Implementation Guide

## ✅ What Has Been Created

I've created a complete **Free User Experience** that allows non-logged-in users to browse content without modifying your existing code. Here's what was built:

### 📁 New Folder Structure

```
lib/feature/free_user/
├── controller/
│   └── free_user_home_controller.dart
├── ui/
│   └── free_user_home_page.dart
└── widgets/
    ├── login_prompt_dialog.dart
    ├── free_user_trending_event_widget.dart
    ├── free_user_popular_club_widget.dart
    └── free_user_newsfeed_widget.dart
```

### 🎯 Key Features

1. **Public API Endpoints** - Added to `endpoints.dart`:
   - `publicEvents` - `/events/public` (GET - no auth)
   - Uses existing `allPostList` for public posts

2. **FreeUserHomeController**:
   - Fetches public events and posts WITHOUT authentication
   - No token required (`is_auth: false`)
   - Separate from your existing home controller

3. **FreeUserHomePage**:
   - Exact mimic of your home page UI
   - 2 tabs: Newsfeed and Events
   - All interactions redirect to login

4. **Widgets**:
   - **Login Prompt Dialog** - Beautiful dialog asking users to login
   - **Trending Events Widget** - Shows events with disabled favorite button
   - **Popular Clubs Widget** - Shows clubs with disabled interactions
   - **Newsfeed Widget** - Shows public posts with disabled like/comment/share

### 🔒 User Restrictions

Free users can:
- ✅ View public events
- ✅ View public posts  
- ✅ Browse trending events and popular clubs
- ✅ See post content and images

Free users CANNOT:
- ❌ Like posts or events
- ❌ Comment on posts
- ❌ Create posts
- ❌ Message users
- ❌ Search (redirects to login)
- ❌ See community profiles (login prompt)

All interactive elements show a login prompt dialog and redirect to `/login`.

---

## 🚀 How to Integrate (Routing Logic)

You need to add routing logic to check if the user has a token and redirect accordingly.

### Option 1: In your main.dart or app initialization

```dart
// Example in your initial route logic
Widget getInitialPage() {
  // Check if user has a valid token
  final token = await storage.read('token'); // Your token storage method
  
  if (token == null || token.isEmpty) {
    // No token - show free user home
    return FreeUserHomePage();
  } else {
    // Has token - show regular home with bottom nav
    return HomeBottomNavigation(); // Your existing home
  }
}
```

### Option 2: In your splash screen or auth check

```dart
import 'package:pineapple/feature/free_user/ui/free_user_home_page.dart';

class SplashScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: checkAuthentication(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done) {
          if (snapshot.data == true) {
            // User is authenticated
            return HomeBottomNavigation(); // Your existing home
          } else {
            // User is NOT authenticated
            return FreeUserHomePage(); // New free user home
          }
        }
        return LoadingScreen();
      },
    );
  }
  
  Future<bool> checkAuthentication() async {
    final token = await storage.read('token');
    return token != null && token.isNotEmpty;
  }
}
```

### Option 3: Add a route guard

```dart
// In your GetX routing or navigation
class AuthMiddleware extends GetMiddleware {
  @override
  RouteSettings? redirect(String? route) {
    final token = Get.find<AuthController>().token.value;
    
    if (token == null || token.isEmpty) {
      // Redirect to free user home
      return RouteSettings(name: '/free-home');
    }
    return null; // Continue to requested route
  }
}

// Register routes
GetPage(
  name: '/free-home',
  page: () => FreeUserHomePage(),
),
```

---

## 📝 Important Notes

### Navigation to Login

The login prompt dialog uses:
```dart
Get.offAllNamed('/login');
```

Make sure you have a `/login` route registered in your app. If your login route is different, update it in:
- `lib/feature/free_user/widgets/login_prompt_dialog.dart`
- `lib/feature/free_user/ui/free_user_home_page.dart` (the "Unlock Full Access" button)

### API Requirements

Make sure your backend:
1. Has `/api/v1/events/public` endpoint that returns public events WITHOUT requiring authentication
2. The `/api/v1/post/posts` endpoint allows public access (or create a public version)

### Token Storage

The controller uses `is_auth: false` parameter. Make sure your `NetworkConfigV1` class properly handles this:
```dart
ApiRequestHandler(
  RequestMethod.GET,
  Urls.publicEvents,
  jsonEncode({}),
  is_auth: false, // Should NOT send auth token
);
```

---

## 🎨 Customization

### Change Login Prompt Message

Edit `lib/feature/free_user/widgets/login_prompt_dialog.dart`:
```dart
content: Text(
  'Your custom message here!',
  // ...
),
```

### Modify "Unlock Full Access" Section

Edit `lib/feature/free_user/ui/free_user_home_page.dart` around line 185.

### Change Tab Names

Edit `FreeUserHomeController`:
```dart
List<String> tabTitles = ['Newsfeed', 'Event']; // Change these
```

---

## 🧪 Testing

1. **Test without token**:
   - Clear your app's stored token
   - Launch the app
   - Should see `FreeUserHomePage`
   - Try clicking any interactive element → should show login prompt

2. **Test with token**:
   - Login normally
   - Should see your existing home page
   - All features should work normally

3. **Test API calls**:
   - Monitor network calls
   - Free user endpoints should NOT send Authorization header
   - Should fetch public data successfully

---

## 📦 Files Modified

Only ONE existing file was modified:
- ✅ `lib/core/network_caller/endpoints.dart` - Added `publicEvents` endpoint

All other files are NEW and don't affect your existing code.

---

## 🎯 Next Steps

1. **Add routing logic** (see examples above)
2. **Test the free user flow**
3. **Verify API endpoints** work without authentication
4. **Customize messages** if needed
5. **Test the full user journey**: Free User → Login → Authenticated User

---

## 💡 Tips

- The free user experience is completely separate from your existing code
- No risk of breaking existing functionality
- Easy to remove if needed - just delete the `lib/feature/free_user` folder
- Consider adding analytics to track free user engagement before login

---

## 🐛 Troubleshooting

**Issue**: Free users see authenticated content
- **Fix**: Check your routing logic - ensure token check happens before navigation

**Issue**: API calls fail
- **Fix**: Verify `is_auth: false` is properly handled in `NetworkConfigV1`

**Issue**: Login button doesn't work  
- **Fix**: Check your login route name matches `/login` or update the dialog

**Issue**: Images don't load
- **Fix**: Ensure `ResponsiveNetworkImage` widget works without authentication

---

Need help? All the code is well-commented and follows your existing patterns! 🚀
