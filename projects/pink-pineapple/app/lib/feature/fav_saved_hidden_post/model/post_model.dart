class PostModel {
  final String id;
  final String title;
  final String description;
  final String imageUrl;
  final String location;
  final String date;
  final String time;
  final bool isFavourite;
  final bool isSaved;
  final bool isHidden;

  PostModel({
    required this.id,
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.location,
    required this.date,
    required this.time,
    this.isFavourite = false,
    this.isSaved = false,
    this.isHidden = false,
  });

  PostModel copyWith({
    String? id,
    String? title,
    String? description,
    String? imageUrl,
    String? location,
    String? date,
    String? time,
    bool? isFavourite,
    bool? isSaved,
    bool? isHidden,
  }) {
    return PostModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      location: location ?? this.location,
      date: date ?? this.date,
      time: time ?? this.time,
      isFavourite: isFavourite ?? this.isFavourite,
      isSaved: isSaved ?? this.isSaved,
      isHidden: isHidden ?? this.isHidden,
    );
  }
}
