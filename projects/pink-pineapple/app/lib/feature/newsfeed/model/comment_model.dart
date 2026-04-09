

class CommentModel {
  final String? id;
  final String? text;
  final String? userId;
  final String? postId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final User? user;

  CommentModel({
    this.id,
    this.text,
    this.userId,
    this.postId,
    this.createdAt,
    this.updatedAt,
    this.user,
  });

  CommentModel copyWith({
    String? id,
    String? text,
    String? userId,
    String? postId,
    DateTime? createdAt,
    DateTime? updatedAt,
    User? user,
  }) =>
      CommentModel(
        id: id ?? this.id,
        text: text ?? this.text,
        userId: userId ?? this.userId,
        postId: postId ?? this.postId,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        user: user ?? this.user,
      );

  factory CommentModel.fromJson(Map<String, dynamic> json) => CommentModel(
    id: json["id"],
    text: json["text"],
    userId: json["userId"],
    postId: json["postId"],
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
    user: json["user"] == null ? null : User.fromJson(json["user"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "text": text,
    "userId": userId,
    "postId": postId,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "user": user?.toJson(),
  };
}

class User {
  final String? id;
  final String? fullName;
  final String? profileImage;
  final String? email;

  User({
    this.id,
    this.fullName,
    this.profileImage,
    this.email,
  });

  User copyWith({
    String? id,
    String? fullName,
    String? profileImage,
    String? email,
  }) =>
      User(
        id: id ?? this.id,
        fullName: fullName ?? this.fullName,
        profileImage: profileImage ?? this.profileImage,
        email: email ?? this.email,
      );

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json["id"],
    fullName: json["fullName"],
    profileImage: json["profileImage"],
    email: json["email"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullName": fullName,
    "profileImage": profileImage,
    "email": email,
  };
}
