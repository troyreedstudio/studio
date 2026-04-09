

class FavoriteEventModel {
  final String? id;
  final List<String>? eventImages;
  final String? eventName;
  final String? descriptions;
  final DateTime? startDate;
  final DateTime? endDate;

  FavoriteEventModel({
    this.id,
    this.eventImages,
    this.eventName,
    this.descriptions,
    this.startDate,
    this.endDate,
  });

  FavoriteEventModel copyWith({
    String? id,
    List<String>? eventImages,
    String? eventName,
    String? descriptions,
    DateTime? startDate,
    DateTime? endDate,
  }) =>
      FavoriteEventModel(
        id: id ?? this.id,
        eventImages: eventImages ?? this.eventImages,
        eventName: eventName ?? this.eventName,
        descriptions: descriptions ?? this.descriptions,
        startDate: startDate ?? this.startDate,
        endDate: endDate ?? this.endDate,
      );

  factory FavoriteEventModel.fromJson(Map<String, dynamic> json) => FavoriteEventModel(
    id: json["id"],
    eventImages: json["eventImages"] == null ? [] : List<String>.from(json["eventImages"]!.map((x) => x)),
    eventName: json["eventName"],
    descriptions: json["descriptions"],
    startDate: json["startDate"] == null ? null : DateTime.parse(json["startDate"]),
    endDate: json["endDate"] == null ? null : DateTime.parse(json["endDate"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "eventImages": eventImages == null ? [] : List<dynamic>.from(eventImages!.map((x) => x)),
    "eventName": eventName,
    "descriptions": descriptions,
    "startDate": startDate?.toIso8601String(),
    "endDate": endDate?.toIso8601String(),
  };
}


