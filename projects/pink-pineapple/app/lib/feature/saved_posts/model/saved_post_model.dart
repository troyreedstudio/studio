
class SavedPostModel {
  final String? id;
  final String? userId;
  final String? postId;
  final User? user;
  final Post? post;

  SavedPostModel({
    this.id,
    this.userId,
    this.postId,
    this.user,
    this.post,
  });

  SavedPostModel copyWith({
    String? id,
    String? userId,
    String? postId,
    User? user,
    Post? post,
  }) =>
      SavedPostModel(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        postId: postId ?? this.postId,
        user: user ?? this.user,
        post: post ?? this.post,
      );

  factory SavedPostModel.fromJson(Map<String, dynamic> json) => SavedPostModel(
    id: json["id"],
    userId: json["userId"],
    postId: json["postId"],
    user: json["user"] == null ? null : User.fromJson(json["user"]),
    post: json["post"] == null ? null : Post.fromJson(json["post"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "userId": userId,
    "postId": postId,
    "user": user?.toJson(),
    "post": post?.toJson(),
  };
}

class Post {
  final String? id;
  final List<Photo>? photos;
  final String? text;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final User? user;

  Post({
    this.id,
    this.photos,
    this.text,
    this.createdAt,
    this.updatedAt,
    this.user,
  });

  Post copyWith({
    String? id,
    List<Photo>? photos,
    String? text,
    DateTime? createdAt,
    DateTime? updatedAt,
    User? user,
  }) =>
      Post(
        id: id ?? this.id,
        photos: photos ?? this.photos,
        text: text ?? this.text,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        user: user ?? this.user,
      );

  factory Post.fromJson(Map<String, dynamic> json) => Post(
    id: json["id"],
    photos: json["photos"] == null ? [] : List<Photo>.from(json["photos"]!.map((x) => Photo.fromJson(x))),
    text: json["text"],
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
    user: json["user"] == null ? null : User.fromJson(json["user"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "photos": photos == null ? [] : List<dynamic>.from(photos!.map((x) => x.toJson())),
    "text": text,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "user": user?.toJson(),
  };
}

class Photo {
  final String? url;

  Photo({
    this.url,
  });

  Photo copyWith({
    String? url,
  }) =>
      Photo(
        url: url ?? this.url,
      );

  factory Photo.fromJson(Map<String, dynamic> json) => Photo(
    url: json["url"],
  );

  Map<String, dynamic> toJson() => {
    "url": url,
  };
}

class User {
  final String? id;
  final String? fullAddress;
  final String? fullName;
  final String? profileImage;

  User({
    this.id,
    this.fullAddress,
    this.fullName,
    this.profileImage,
  });

  User copyWith({
    String? id,
    String? fullAddress,
    String? fullName,
    String? profileImage,
  }) =>
      User(
        id: id ?? this.id,
        fullAddress: fullAddress ?? this.fullAddress,
        fullName: fullName ?? this.fullName,
        profileImage: profileImage ?? this.profileImage,
      );

  factory User.fromJson(Map<String, dynamic> json) => User(
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
