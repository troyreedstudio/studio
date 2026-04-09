class EventModel {
  final String id;
  final String title;
  final String location;
  final String category;
  final DateTime dateTime;
  final String description;
  final int attendingCount;
  final List<String> imageUrls;
  final DateTime lastRegistrationDate;
  final DateTime arriveBeforeDate;
  final int additionalGuests;
  final List<TicketOption> ticketOptions;
  final List<TableOption> tableOptions;

  EventModel({
    required this.id,
    required this.title,
    required this.location,
    required this.category,
    required this.dateTime,
    required this.description,
    required this.attendingCount,
    required this.imageUrls,
    required this.lastRegistrationDate,
    required this.arriveBeforeDate,
    required this.additionalGuests,
    required this.ticketOptions,
    required this.tableOptions,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    return EventModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      location: json['location'] ?? '',
      category: json['category'] ?? '',
      dateTime: DateTime.parse(
        json['dateTime'] ?? DateTime.now().toIso8601String(),
      ),
      description: json['description'] ?? '',
      attendingCount: json['attendingCount'] ?? 0,
      imageUrls: List<String>.from(json['imageUrls'] ?? []),
      lastRegistrationDate: DateTime.parse(
        json['lastRegistrationDate'] ?? DateTime.now().toIso8601String(),
      ),
      arriveBeforeDate: DateTime.parse(
        json['arriveBeforeDate'] ?? DateTime.now().toIso8601String(),
      ),
      additionalGuests: json['additionalGuests'] ?? 0,
      ticketOptions:
          (json['ticketOptions'] as List<dynamic>?)
              ?.map((e) => TicketOption.fromJson(e))
              .toList() ??
          [],
      tableOptions:
          (json['tableOptions'] as List<dynamic>?)
              ?.map((e) => TableOption.fromJson(e))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'location': location,
      'category': category,
      'dateTime': dateTime.toIso8601String(),
      'description': description,
      'attendingCount': attendingCount,
      'imageUrls': imageUrls,
      'lastRegistrationDate': lastRegistrationDate.toIso8601String(),
      'arriveBeforeDate': arriveBeforeDate.toIso8601String(),
      'additionalGuests': additionalGuests,
      'ticketOptions': ticketOptions.map((e) => e.toJson()).toList(),
      'tableOptions': tableOptions.map((e) => e.toJson()).toList(),
    };
  }

  String get formattedDate {
    final months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[dateTime.month]} ${dateTime.day}';
  }

  String get formattedTime {
    final hour = dateTime.hour > 12 ? dateTime.hour - 12 : dateTime.hour;
    final period = dateTime.hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour == 0 ? 12 : hour;
    return '$displayHour:${dateTime.minute.toString().padLeft(2, '0')} $period';
  }

  String get formattedDateTime {
    return 'Mon, ${formattedDate} • ${formattedTime} - 23:00 PM';
  }
}

class TicketOption {
  final String id;
  final String title;
  final double price;
  final bool includesFees;

  TicketOption({
    required this.id,
    required this.title,
    required this.price,
    this.includesFees = true,
  });

  factory TicketOption.fromJson(Map<String, dynamic> json) {
    return TicketOption(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      includesFees: json['includesFees'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'price': price,
      'includesFees': includesFees,
    };
  }

  String get priceText {
    return '\$${price.toStringAsFixed(2)}${includesFees ? ' (includes fees)' : ''}';
  }
}

class TableOption {
  final String id;
  final String title;
  final int maxGuests;
  final double minimumSpend;
  final String description;

  TableOption({
    required this.id,
    required this.title,
    required this.maxGuests,
    required this.minimumSpend,
    required this.description,
  });

  factory TableOption.fromJson(Map<String, dynamic> json) {
    return TableOption(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      maxGuests: json['maxGuests'] ?? 0,
      minimumSpend: (json['minimumSpend'] ?? 0).toDouble(),
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'maxGuests': maxGuests,
      'minimumSpend': minimumSpend,
      'description': description,
    };
  }

  String get guestInfo {
    return '$maxGuests Guests (\$${minimumSpend.toStringAsFixed(2)} minimum)';
  }
}

class BookingDetails {
  final String tableId;
  final String tableName;
  final int maxGuests;
  final double minimumSpend;
  final int selectedFemales;
  final int selectedMales;
  final bool includeFoodAndBeverage;

  BookingDetails({
    required this.tableId,
    required this.tableName,
    required this.maxGuests,
    required this.minimumSpend,
    required this.selectedFemales,
    required this.selectedMales,
    this.includeFoodAndBeverage = false,
  });

  int get totalGuests => selectedFemales + selectedMales;

  bool get isValidBooking => totalGuests > 0 && totalGuests <= maxGuests;
}
