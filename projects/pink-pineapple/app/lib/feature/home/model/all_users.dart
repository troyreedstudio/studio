
class AllUsersModel {
  final String? id;
  final String? fullName;
  final String? email;
  final String? profileImage;
  final String? fullAddress;
  final Status? status;
  final bool? isApproved;
  final Role? role;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final bool? isFavorite;

  AllUsersModel({
    this.id,
    this.fullName,
    this.email,
    this.profileImage,
    this.fullAddress,
    this.status,
    this.isApproved,
    this.role,
    this.createdAt,
    this.updatedAt,
    this.isFavorite,
  });

  AllUsersModel copyWith({
    String? id,
    String? fullName,
    String? email,
    String? profileImage,
    String? fullAddress,
    Status? status,
    bool? isApproved,
    Role? role,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isFavorite,
  }) =>
      AllUsersModel(
        id: id ?? this.id,
        fullName: fullName ?? this.fullName,
        email: email ?? this.email,
        profileImage: profileImage ?? this.profileImage,
        fullAddress: fullAddress ?? this.fullAddress,
        status: status ?? this.status,
        isApproved: isApproved ?? this.isApproved,
        role: role ?? this.role,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        isFavorite: isFavorite ?? this.isFavorite,
      );

  factory AllUsersModel.fromJson(Map<String, dynamic> json) => AllUsersModel(
    id: json["id"],
    fullName: json["fullName"],
    email: json["email"],
    profileImage: json["profileImage"],
    fullAddress: json["fullAddress"],
    status: statusValues.map[json["status"]]!,
    isApproved: json["isApproved"],
    role: roleValues.map[json["role"]]!,
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
    isFavorite: json["isFavorite"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullName": fullName,
    "email": email,
    "profileImage": profileImage,
    "fullAddress": fullAddress,
    "status": statusValues.reverse[status],
    "isApproved": isApproved,
    "role": roleValues.reverse[role],
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "isFavorite": isFavorite,
  };
}

enum Role {
  CLUB,
  USER
}

final roleValues = EnumValues({
  "CLUB": Role.CLUB,
  "USER": Role.USER
});

enum Status {
  ACTIVE,
  INACTIVE,
  PENDING
}

final statusValues = EnumValues({
  "ACTIVE": Status.ACTIVE,
  "INACTIVE": Status.INACTIVE,
  "PENDING": Status.PENDING
});

class Meta {
  final int? page;
  final int? limit;
  final int? total;

  Meta({
    this.page,
    this.limit,
    this.total,
  });

  Meta copyWith({
    int? page,
    int? limit,
    int? total,
  }) =>
      Meta(
        page: page ?? this.page,
        limit: limit ?? this.limit,
        total: total ?? this.total,
      );

  factory Meta.fromJson(Map<String, dynamic> json) => Meta(
    page: json["page"],
    limit: json["limit"],
    total: json["total"],
  );

  Map<String, dynamic> toJson() => {
    "page": page,
    "limit": limit,
    "total": total,
  };
}

class EnumValues<T> {
  Map<String, T> map;
  late Map<T, String> reverseMap;

  EnumValues(this.map);

  Map<T, String> get reverse {
    reverseMap = map.map((k, v) => MapEntry(v, k));
    return reverseMap;
  }
}
