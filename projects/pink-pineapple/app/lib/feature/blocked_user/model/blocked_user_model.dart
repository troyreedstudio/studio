
class BlockedUserModel {
  final String? id;
  final String? fullAddress;
  final String? fullName;
  final String? email;
  final String? profileImage;

  BlockedUserModel({
    this.id,
    this.fullAddress,
    this.fullName,
    this.email,
    this.profileImage,
  });

  BlockedUserModel copyWith({
    String? id,
    String? fullAddress,
    String? fullName,
    String? email,
    String? profileImage,
  }) =>
      BlockedUserModel(
        id: id ?? this.id,
        fullAddress: fullAddress ?? this.fullAddress,
        fullName: fullName ?? this.fullName,
        email: email ?? this.email,
        profileImage: profileImage ?? this.profileImage,
      );

  factory BlockedUserModel.fromJson(Map<String, dynamic> json) => BlockedUserModel(
    id: json["id"],
    fullAddress: json["fullAddress"],
    fullName: json["fullName"],
    email: json["email"],
    profileImage: json["profileImage"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullAddress": fullAddress,
    "fullName": fullName,
    "email": email,
    "profileImage": profileImage,
  };
}
extension BlockedUserParsing on BlockedUserModel {
  /// Build from an envelope item like:
  /// { "id": "...envelopeId...", "blocked": { ...user fields... } }
  static BlockedUserModel fromEnvelope(Map<String, dynamic> json) {
    final blocked = (json['blocked'] ?? {}) as Map<String, dynamic>;
    return BlockedUserModel.fromJson(blocked);
  }
}
