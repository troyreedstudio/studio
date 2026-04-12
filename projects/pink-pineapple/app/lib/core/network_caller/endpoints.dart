class Urls {
  static const String baseUrl = 'https://api.pinkpineapple.app/api/v1';
  static const String wsUrl = 'wss://api.pinkpineapple.app';

  static const String login = '$baseUrl/auth/login';
  static const String register = '$baseUrl/users/register';
  static const String forgetPassword = '$baseUrl/auth/forgot-password';

  static const String getAnalytics = '$baseUrl/deposit/analytics';
  static const String getProperties = '$baseUrl/properties';
  static const String getDeposit = '$baseUrl/deposit';
  static const String getActivities = '$baseUrl/activity';
  static const String getNotification = '$baseUrl/notifications/get';
  static const String profile = '$baseUrl/users/profile';
  static const String getDeposite = '$baseUrl/deposit/user';

  static const String verifyOTP = '$baseUrl/auth/verify-otp';
  static const String signUp = '$baseUrl/users/register';
  static const String resetPassword = '$baseUrl/auth/reset-password';
  static const String changePassword = '$baseUrl/auth/change-password';

  /// events
  static const String allEvents = '$baseUrl/events'; // GET
  static const String publicEvents =
      '$baseUrl/events/public'; // GET - for free users
  static const String eventDetails = '$baseUrl/events'; // GET
  static const String tonightEvent = '$baseUrl/events/tonight'; // GET

  /// users
  static const String allUsers = '$baseUrl/users';
  static const String userProfile = '$baseUrl/auth/profile';
  static const String getSingleUser = '$baseUrl/auth';
  static const String updateUser = '$baseUrl/users/update-profile'; // POST

  /// bookings
  static const String bookingList = '$baseUrl/booking/my-booking?status=';
  static const String createBooking = '$baseUrl/booking'; // POST

  /// posts
  static const String allPostList = '$baseUrl/post/posts'; // GET
  static const String getMyAllPost = '$baseUrl/post/get-my-posts'; // GET
  static const String createPost = '$baseUrl/post/add-post'; // POST
  static const String likePost = '$baseUrl/like'; // POST
  static const String postFavorite = '$baseUrl/post-favorite'; // POST
  static const String savedFavoritePost = '$baseUrl/post-favorite'; // GET
  static const String deletePost = '$baseUrl/post/posts'; // DELETE
  static const String hideUnhidePost = '$baseUrl/post/hide-unhide-post'; // PUT
  static const String getPostByID = '$baseUrl/post/user-posts'; // GET

  /// comments
  static const String getCommentsByPostID = '$baseUrl/comments/post'; // GET
  static const String addComment = '$baseUrl/comments'; // GET

  /// favorite event
  static const String favoriteEvent = '$baseUrl/event-favorite'; // POST
  static const String getAllFavoriteEvent = '$baseUrl/event-favorite'; // GET

  /// follow
  static const String sendFollowRequest = '$baseUrl/follow/request'; // POST
  static const String getFollowingFollowersRequest =
      '$baseUrl/follow/all-list'; // GET
  static const String deleteFollowRequest = '$baseUrl/follow/decline'; // DELETE

  /// block
  static const String getAllBlockUser = '$baseUrl/block'; // GET
  static const String toggleBlockUnblock = '$baseUrl/block'; // POST

  /// payments
  static const String createCheckout = '$baseUrl/payments/checkout'; // POST
  static const String paymentStatus = '$baseUrl/payments/status'; // GET — append /:bookingId

  /// venues
  static const String allVenues = '$baseUrl/venues'; // GET
  static const String featuredVenues = '$baseUrl/venues/featured'; // GET
  static const String venuesByArea = '$baseUrl/venues/area'; // GET — append /:area
  static const String searchVenues = '$baseUrl/venues/search'; // GET
  static const String venueDetails = '$baseUrl/venues'; // GET — append /:id
  static const String toggleVenueFavorite = '$baseUrl/venues'; // POST — append /:id/favorite
}
