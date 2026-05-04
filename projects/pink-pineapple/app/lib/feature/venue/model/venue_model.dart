class VenueModel {
  final String id;
  final String name;
  final String slug;
  final String description;
  final String editorial;
  final String area;
  final String category;
  final String address;
  final double? latitude;
  final double? longitude;
  final String phone;
  final String website;
  final String instagram;
  final int priceRange;
  final Map<String, dynamic>? openingHours;
  final List<String> photos;
  final String heroImage;
  final bool isActive;
  final bool isFeatured;
  final double rating;
  final String ownerId;
  final String bookingUrl;
  // Booking integration metadata. bookingProvider tells the UI how to
  // dispatch the "Book" action (URL/phone/whatsapp/instagram). The
  // contact-only providers don't use bookingUrl.
  final String bookingProvider;
  final String bookingPhone;
  final String bookingWhatsapp;
  final String bookingInstagram;
  /// Per-day URL routing (e.g. Mesa: different URL Mon/Tue/Wed). Keys are
  /// short day names: 'mon', 'tue', etc.
  final Map<String, dynamic>? bookingDailyUrls;
  final bool isFavorite;
  final List<String> tags;
  final Map<String, dynamic>? weeklySchedule;
  // Pink Pineapple aggregate rating (computed server-side from VenueRating)
  final double? ppRating;
  final int? ppRatingCount;
  // Google Places rating + total ratings count (backfilled)
  final double? googleRating;
  final int? googleRatingCount;
  // Recent vibe check (averaged over last 4 hours), null if none
  final Map<String, dynamic>? recentVibe;
  final DateTime createdAt;
  final DateTime updatedAt;

  VenueModel({
    required this.id,
    required this.name,
    this.slug = '',
    this.description = '',
    this.editorial = '',
    this.area = '',
    this.category = '',
    this.address = '',
    this.latitude,
    this.longitude,
    this.phone = '',
    this.website = '',
    this.instagram = '',
    this.priceRange = 1,
    this.openingHours,
    this.weeklySchedule,
    this.photos = const [],
    this.heroImage = '',
    this.isActive = true,
    this.isFeatured = false,
    this.rating = 0.0,
    this.ownerId = '',
    this.bookingUrl = '',
    this.bookingProvider = '',
    this.bookingPhone = '',
    this.bookingWhatsapp = '',
    this.bookingInstagram = '',
    this.bookingDailyUrls,
    this.isFavorite = false,
    this.tags = const [],
    this.ppRating,
    this.ppRatingCount,
    this.googleRating,
    this.googleRatingCount,
    this.recentVibe,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VenueModel.fromJson(Map<String, dynamic> json) {
    return VenueModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      editorial: json['editorial']?.toString() ?? '',
      area: json['area']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      phone: json['phone']?.toString() ?? '',
      website: json['website']?.toString() ?? '',
      instagram: json['instagram']?.toString() ?? '',
      priceRange: (json['priceRange'] as num?)?.toInt() ?? 1,
      openingHours: json['openingHours'] is Map<String, dynamic>
          ? json['openingHours'] as Map<String, dynamic>
          : null,
      weeklySchedule: json['weeklySchedule'] is Map<String, dynamic>
          ? json['weeklySchedule'] as Map<String, dynamic>
          : null,
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      heroImage: json['heroImage']?.toString() ?? '',
      isActive: json['isActive'] as bool? ?? true,
      isFeatured: json['isFeatured'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      ownerId: json['ownerId']?.toString() ?? '',
      bookingUrl: json['bookingUrl']?.toString() ?? '',
      bookingProvider: json['bookingProvider']?.toString() ?? '',
      bookingPhone: json['bookingPhone']?.toString() ?? '',
      bookingWhatsapp: json['bookingWhatsapp']?.toString() ?? '',
      bookingInstagram: json['bookingInstagram']?.toString() ?? '',
      bookingDailyUrls: json['bookingDailyUrls'] is Map<String, dynamic>
          ? json['bookingDailyUrls'] as Map<String, dynamic>
          : null,
      isFavorite: json['isFavorite'] as bool? ?? false,
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      ppRating: (json['ppRating'] as num?)?.toDouble(),
      ppRatingCount: (json['ppRatingCount'] as num?)?.toInt(),
      googleRating: (json['googleRating'] as num?)?.toDouble(),
      googleRatingCount: (json['googleRatingCount'] as num?)?.toInt(),
      recentVibe: json['recentVibe'] is Map<String, dynamic>
          ? json['recentVibe'] as Map<String, dynamic>
          : null,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'editorial': editorial,
      'area': area,
      'category': category,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'phone': phone,
      'website': website,
      'instagram': instagram,
      'priceRange': priceRange,
      'openingHours': openingHours,
      'weeklySchedule': weeklySchedule,
      'photos': photos,
      'heroImage': heroImage,
      'isActive': isActive,
      'isFeatured': isFeatured,
      'rating': rating,
      'ownerId': ownerId,
      'bookingUrl': bookingUrl,
      'isFavorite': isFavorite,
      'tags': tags,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  VenueModel copyWith({
    String? id,
    String? name,
    String? slug,
    String? description,
    String? editorial,
    String? area,
    String? category,
    String? address,
    double? latitude,
    double? longitude,
    String? phone,
    String? website,
    String? instagram,
    int? priceRange,
    Map<String, dynamic>? openingHours,
    Map<String, dynamic>? weeklySchedule,
    List<String>? photos,
    String? heroImage,
    bool? isActive,
    bool? isFeatured,
    double? rating,
    String? ownerId,
    String? bookingUrl,
    bool? isFavorite,
    List<String>? tags,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return VenueModel(
      id: id ?? this.id,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      editorial: editorial ?? this.editorial,
      area: area ?? this.area,
      category: category ?? this.category,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      phone: phone ?? this.phone,
      website: website ?? this.website,
      instagram: instagram ?? this.instagram,
      priceRange: priceRange ?? this.priceRange,
      openingHours: openingHours ?? this.openingHours,
      weeklySchedule: weeklySchedule ?? this.weeklySchedule,
      photos: photos ?? this.photos,
      heroImage: heroImage ?? this.heroImage,
      isActive: isActive ?? this.isActive,
      isFeatured: isFeatured ?? this.isFeatured,
      rating: rating ?? this.rating,
      ownerId: ownerId ?? this.ownerId,
      bookingUrl: bookingUrl ?? this.bookingUrl,
      isFavorite: isFavorite ?? this.isFavorite,
      tags: tags ?? this.tags,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
