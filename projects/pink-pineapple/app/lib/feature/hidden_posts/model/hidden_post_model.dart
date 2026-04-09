

class HiddenPostModel {
  final String? id;
  final String? text;
  final List<Photo>? photos;
  final List<dynamic>? videos;
  final bool? isHidden;
  final int? likeCount;
  final UserId? userId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final User? user;
  final List<Comment>? comments;
  final Count? count;

  HiddenPostModel({
    this.id,
    this.text,
    this.photos,
    this.videos,
    this.isHidden,
    this.likeCount,
    this.userId,
    this.createdAt,
    this.updatedAt,
    this.user,
    this.comments,
    this.count,
  });

  HiddenPostModel copyWith({
    String? id,
    String? text,
    List<Photo>? photos,
    List<dynamic>? videos,
    bool? isHidden,
    int? likeCount,
    UserId? userId,
    DateTime? createdAt,
    DateTime? updatedAt,
    User? user,
    List<Comment>? comments,
    Count? count,
  }) =>
      HiddenPostModel(
        id: id ?? this.id,
        text: text ?? this.text,
        photos: photos ?? this.photos,
        videos: videos ?? this.videos,
        isHidden: isHidden ?? this.isHidden,
        likeCount: likeCount ?? this.likeCount,
        userId: userId ?? this.userId,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        user: user ?? this.user,
        comments: comments ?? this.comments,
        count: count ?? this.count,
      );

  factory HiddenPostModel.fromJson(Map<String, dynamic> json) => HiddenPostModel(
    id: json["id"],
    text: json["text"],
    photos: json["photos"] == null ? [] : List<Photo>.from(json["photos"]!.map((x) => Photo.fromJson(x))),
    videos: json["videos"] == null ? [] : List<dynamic>.from(json["videos"]!.map((x) => x)),
    isHidden: json["isHidden"],
    likeCount: json["likeCount"],
    userId: userIdValues.map[json["userId"]],
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
    user: json["user"] == null ? null : User.fromJson(json["user"]),
    comments: json["comments"] == null ? [] : List<Comment>.from(json["comments"]!.map((x) => Comment.fromJson(x))),
    count: json["_count"] == null ? null : Count.fromJson(json["_count"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "text": text,
    "photos": photos == null ? [] : List<dynamic>.from(photos!.map((x) => x.toJson())),
    "videos": videos == null ? [] : List<dynamic>.from(videos!.map((x) => x)),
    "isHidden": isHidden,
    "likeCount": likeCount,
    "userId": userIdValues.reverse[userId],
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "user": user?.toJson(),
    "comments": comments == null ? [] : List<dynamic>.from(comments!.map((x) => x.toJson())),
    "_count": count?.toJson(),
  };
}

class Comment {
  final String? id;
  final String? text;
  final UserId? userId;
  final String? postId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Comment({
    this.id,
    this.text,
    this.userId,
    this.postId,
    this.createdAt,
    this.updatedAt,
  });

  Comment copyWith({
    String? id,
    String? text,
    UserId? userId,
    String? postId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      Comment(
        id: id ?? this.id,
        text: text ?? this.text,
        userId: userId ?? this.userId,
        postId: postId ?? this.postId,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  factory Comment.fromJson(Map<String, dynamic> json) => Comment(
    id: json["id"],
    text: json["text"],
    userId: userIdValues.map[json["userId"]]!,
    postId: json["postId"],
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "text": text,
    "userId": userIdValues.reverse[userId],
    "postId": postId,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}

enum UserId {
  THE_68_F8_B3_DDDDF0_B8609184_D4_E0
}

final userIdValues = EnumValues({
  "68f8b3ddddf0b8609184d4e0": UserId.THE_68_F8_B3_DDDDF0_B8609184_D4_E0
});

class Count {
  final int? comments;

  Count({
    this.comments,
  });

  Count copyWith({
    int? comments,
  }) =>
      Count(
        comments: comments ?? this.comments,
      );

  factory Count.fromJson(Map<String, dynamic> json) => Count(
    comments: json["comments"],
  );

  Map<String, dynamic> toJson() => {
    "comments": comments,
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
  final UserId? id;
  final FullName? fullName;
  final Email? email;
  final String? profileImage;
  final FullAddress? fullAddress;

  User({
    this.id,
    this.fullName,
    this.email,
    this.profileImage,
    this.fullAddress,
  });

  User copyWith({
    UserId? id,
    FullName? fullName,
    Email? email,
    String? profileImage,
    FullAddress? fullAddress,
  }) =>
      User(
        id: id ?? this.id,
        fullName: fullName ?? this.fullName,
        email: email ?? this.email,
        profileImage: profileImage ?? this.profileImage,
        fullAddress: fullAddress ?? this.fullAddress,
      );

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: userIdValues.map[json["id"]],
    fullName: fullNameValues.map[json["fullName"]],
    email: emailValues.map[json["email"]],
    profileImage: json["profileImage"],
    fullAddress: fullAddressValues.map[json["fullAddress"]],
  );

  Map<String, dynamic> toJson() => {
    "id": userIdValues.reverse[id],
    "fullName": fullNameValues.reverse[fullName],
    "email": emailValues.reverse[email],
    "profileImage": profileImage,
    "fullAddress": fullAddressValues.reverse[fullAddress],
  };
}

enum Email {
  SIKDERSAON1_GMAIL_COM
}

final emailValues = EnumValues({
  "sikdersaon1@gmail.com": Email.SIKDERSAON1_GMAIL_COM
});

enum FullAddress {
  IUHGFKJS
}

final fullAddressValues = EnumValues({
  "iuhgfkjs": FullAddress.IUHGFKJS
});

enum FullName {
  SAON_SIKDER
}

final fullNameValues = EnumValues({
  "Saon Sikder": FullName.SAON_SIKDER
});

class EnumValues<T> {
  Map<String, T> map;
  late Map<T, String> reverseMap;

  EnumValues(this.map);

  Map<T, String> get reverse {
    reverseMap = map.map((k, v) => MapEntry(v, k));
    return reverseMap;
  }
}
