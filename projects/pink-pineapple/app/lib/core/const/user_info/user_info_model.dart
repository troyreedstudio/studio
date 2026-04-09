
class UserInfoModel {
  final UserProfile? userProfile;
  final int? follower;
  final int? following;
  final int? post;

  UserInfoModel({
    this.userProfile,
    this.follower,
    this.following,
    this.post,
  });

  UserInfoModel copyWith({
    UserProfile? userProfile,
    int? follower,
    int? following,
    int? post,
  }) =>
      UserInfoModel(
        userProfile: userProfile ?? this.userProfile,
        follower: follower ?? this.follower,
        following: following ?? this.following,
        post: post ?? this.post,
      );

  factory UserInfoModel.fromJson(Map<String, dynamic> json) => UserInfoModel(
    userProfile: json["userProfile"] == null ? null : UserProfile.fromJson(json["userProfile"]),
    follower: json["follower"],
    following: json["following"],
    post: json["post"],
  );

  Map<String, dynamic> toJson() => {
    "userProfile": userProfile?.toJson(),
    "follower": follower,
    "following": following,
    "post": post,
  };
}

class UserProfile {
  final String? id;
  final String? fullName;
  final String? email;
  final String? username;
  final DateTime? dob;
  final String? profilePrivacy;
  final String? fullAddress;
  final String? bio;
  final String? phoneNumber;
  final String? status;
  final String? profileImage;
  final bool? isCompleteProfile;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  UserProfile({
    this.id,
    this.fullName,
    this.email,
    this.username,
    this.dob,
    this.profilePrivacy,
    this.fullAddress,
    this.bio,
    this.phoneNumber,
    this.status,
    this.profileImage,
    this.isCompleteProfile,
    this.createdAt,
    this.updatedAt,
  });

  UserProfile copyWith({
    String? id,
    String? fullName,
    String? email,
    String? username,
    DateTime? dob,
    String? profilePrivacy,
    String? fullAddress,
    String? bio,
    String? phoneNumber,
    String? status,
    String? profileImage,
    bool? isCompleteProfile,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      UserProfile(
        id: id ?? this.id,
        fullName: fullName ?? this.fullName,
        email: email ?? this.email,
        username: username ?? this.username,
        dob: dob ?? this.dob,
        profilePrivacy: profilePrivacy ?? this.profilePrivacy,
        fullAddress: fullAddress ?? this.fullAddress,
        bio: bio ?? this.bio,
        phoneNumber: phoneNumber ?? this.phoneNumber,
        status: status ?? this.status,
        profileImage: profileImage ?? this.profileImage,
        isCompleteProfile: isCompleteProfile ?? this.isCompleteProfile,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json["id"],
    fullName: json["fullName"],
    email: json["email"],
    username: json["username"],
    dob: json["dob"] == null ? null : DateTime.parse(json["dob"]),
    profilePrivacy: json["profilePrivacy"],
    fullAddress: json["fullAddress"],
    bio: json["bio"],
    phoneNumber: json["phoneNumber"],
    status: json["status"],
    profileImage: json["profileImage"],
    isCompleteProfile: json["isCompleteProfile"],
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullName": fullName,
    "email": email,
    "username": username,
    "dob": dob?.toIso8601String(),
    "profilePrivacy": profilePrivacy,
    "fullAddress": fullAddress,
    "bio": bio,
    "phoneNumber": phoneNumber,
    "status": status,
    "profileImage": profileImage,
    "isCompleteProfile": isCompleteProfile,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
