class NewsFeedPostModel {
  final String? id;
  final String? text;
  final List<Photo>? photos;
  final List<Photo>? videos;
  final bool? isHidden;
  final int? likeCount;
  final bool? isLiked;
  final bool? isSaved;
  final String? userId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final User? user;
  final List<Comment>? comments;
  final Count? count;

  NewsFeedPostModel({
    this.id,
    this.text,
    this.photos,
    this.videos,
    this.isHidden,
    this.likeCount,
    this.isLiked,
    this.isSaved,
    this.userId,
    this.createdAt,
    this.updatedAt,
    this.user,
    this.comments,
    this.count,
  });

  NewsFeedPostModel copyWith({
    String? id,
    String? text,
    List<Photo>? photos,
    List<Photo>? videos,
    bool? isHidden,
    int? likeCount,
    bool? isLiked,
    bool? isSaved,
    String? userId,
    DateTime? createdAt,
    DateTime? updatedAt,
    User? user,
    List<Comment>? comments,
    Count? count,
  }) => NewsFeedPostModel(
    id: id ?? this.id,
    text: text ?? this.text,
    photos: photos ?? this.photos,
    videos: videos ?? this.videos,
    isHidden: isHidden ?? this.isHidden,
    likeCount: likeCount ?? this.likeCount,
    isLiked: isLiked ?? this.isLiked,
    isSaved: isSaved ?? this.isSaved,
    userId: userId ?? this.userId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    user: user ?? this.user,
    comments: comments ?? this.comments,
    count: count ?? this.count,
  );

  factory NewsFeedPostModel.fromJson(Map<String, dynamic> json) =>
      NewsFeedPostModel(
        id: json["id"],
        text: json["text"],
        photos: json["photos"] == null
            ? []
            : List<Photo>.from(json["photos"]!.map((x) => Photo.fromJson(x))),
        videos: json["videos"] == null
            ? []
            : List<Photo>.from(json["videos"]!.map((x) => Photo.fromJson(x))),
        isHidden: json["isHidden"],
        likeCount: json["likeCount"],
        isLiked: json["isLiked"],
        isSaved: json["isSaved"],
        userId: json["userId"],
        createdAt: json["createdAt"] == null
            ? null
            : DateTime.parse(json["createdAt"]),
        updatedAt: json["updatedAt"] == null
            ? null
            : DateTime.parse(json["updatedAt"]),
        user: json["user"] == null ? null : User.fromJson(json["user"]),
        comments: json["comments"] == null
            ? []
            : List<Comment>.from(
                json["comments"]!.map((x) => Comment.fromJson(x)),
              ),
        count: json["_count"] == null ? null : Count.fromJson(json["_count"]),
      );

  Map<String, dynamic> toJson() => {
    "id": id,
    "text": text,
    "photos": photos == null
        ? []
        : List<dynamic>.from(photos!.map((x) => x.toJson())),
    "videos": videos == null
        ? []
        : List<dynamic>.from(videos!.map((x) => x.toJson())),
    "isHidden": isHidden,
    "likeCount": likeCount,
    "isLiked": isLiked,
    "isSaved": isSaved,
    "userId": userId,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "user": user?.toJson(),
    "comments": comments == null
        ? []
        : List<dynamic>.from(comments!.map((x) => x.toJson())),
    "_count": count?.toJson(),
  };
}

class Comment {
  final String? id;
  final String? text;
  final String? userId;
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
    String? userId,
    String? postId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => Comment(
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
    userId: json["userId"],
    postId: json["postId"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "text": text,
    "userId": userId,
    "postId": postId,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}

class Count {
  final int? comments;

  Count({this.comments});

  Count copyWith({int? comments}) => Count(comments: comments ?? this.comments);

  factory Count.fromJson(Map<String, dynamic> json) =>
      Count(comments: json["comments"]);

  Map<String, dynamic> toJson() => {"comments": comments};
}

class Photo {
  final String? url;

  Photo({this.url});

  Photo copyWith({String? url}) => Photo(url: url ?? this.url);

  factory Photo.fromJson(Map<String, dynamic> json) => Photo(url: json["url"]);

  Map<String, dynamic> toJson() => {"url": url};
}

class User {
  final String? id;
  final String? fullName;
  final String? email;
  final String? profileImage;
  final String? fullAddress;

  User({
    this.id,
    this.fullName,
    this.email,
    this.profileImage,
    this.fullAddress,
  });

  User copyWith({
    String? id,
    String? fullName,
    String? email,
    String? profileImage,
    String? fullAddress,
  }) => User(
    id: id ?? this.id,
    fullName: fullName ?? this.fullName,
    email: email ?? this.email,
    profileImage: profileImage ?? this.profileImage,
    fullAddress: fullAddress ?? this.fullAddress,
  );

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json["id"],
    fullName: json["fullName"],
    email: json["email"],
    profileImage: json["profileImage"],
    fullAddress: json["fullAddress"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullName": fullName,
    "email": email,
    "profileImage": profileImage,
    "fullAddress": fullAddress,
  };
}

class Meta {
  final int? page;
  final int? limit;
  final int? total;

  Meta({this.page, this.limit, this.total});

  Meta copyWith({int? page, int? limit, int? total}) => Meta(
    page: page ?? this.page,
    limit: limit ?? this.limit,
    total: total ?? this.total,
  );

  factory Meta.fromJson(Map<String, dynamic> json) =>
      Meta(page: json["page"], limit: json["limit"], total: json["total"]);

  Map<String, dynamic> toJson() => {
    "page": page,
    "limit": limit,
    "total": total,
  };
}
