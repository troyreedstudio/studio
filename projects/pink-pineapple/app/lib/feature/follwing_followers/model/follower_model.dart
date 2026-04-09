class UserFollowingFollowerModel {
  final List<Follow>? follower;
  final List<Follow>? following;

  UserFollowingFollowerModel({this.follower, this.following});

  UserFollowingFollowerModel copyWith({
    List<Follow>? follower,
    List<Follow>? following,
  }) => UserFollowingFollowerModel(
    follower: follower ?? this.follower,
    following: following ?? this.following,
  );

  factory UserFollowingFollowerModel.fromJson(
    Map<String, dynamic> json,
  ) => UserFollowingFollowerModel(
    follower: json["follower"] == null
        ? []
        : List<Follow>.from(json["follower"]!.map((x) => Follow.fromJson(x))),
    following: json["following"] == null
        ? []
        : List<Follow>.from(json["following"]!.map((x) => Follow.fromJson(x))),
  );

  Map<String, dynamic> toJson() => {
    "follower": follower == null
        ? []
        : List<dynamic>.from(follower!.map((x) => x.toJson())),
    "following": following == null
        ? []
        : List<dynamic>.from(following!.map((x) => x.toJson())),
  };
}

class Follow {
  final String? id;
  final String? fullAddress;
  final String? fullName;
  final String? profileImage;

  Follow({this.id, this.fullAddress, this.fullName, this.profileImage});

  Follow copyWith({
    String? id,
    String? fullAddress,
    String? fullName,
    String? profileImage,
  }) => Follow(
    id: id ?? this.id,
    fullAddress: fullAddress ?? this.fullAddress,
    fullName: fullName ?? this.fullName,
    profileImage: profileImage ?? this.profileImage,
  );

  factory Follow.fromJson(Map<String, dynamic> json) => Follow(
    id: json["id"],
    fullAddress: json["fullAddress"],
    fullName: json["fullName"],
    profileImage: json["profileImage"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullAddress": fullAddress,
    "fullName": fullName,
    "profileImage": profileImage,
  };
}
