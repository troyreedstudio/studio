class AllEventModel {
  final String? id;
  final String? eventName;
  final String? descriptions;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? startTime;
  final String? endTime;
  final DateTime? lastRegDate;
  final String? lastRegTime;
  final DateTime? arriveDate;
  final String? arriveTime;
  final int? additionalGuests;
  final String? extraRequirements;
  final List<String>? eventImages;
  final String? eventStatus;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final User? user;
  final List<EventTicket>? eventTickets;
  final List<EventTable>? eventTable;
  final bool? isFavorite;

  AllEventModel({
    this.id,
    this.eventName,
    this.descriptions,
    this.startDate,
    this.endDate,
    this.startTime,
    this.endTime,
    this.lastRegDate,
    this.lastRegTime,
    this.arriveDate,
    this.arriveTime,
    this.additionalGuests,
    this.extraRequirements,
    this.eventImages,
    this.eventStatus,
    this.createdAt,
    this.updatedAt,
    this.user,
    this.eventTickets,
    this.eventTable,
    this.isFavorite,
  });

  AllEventModel copyWith({
    String? id,
    String? eventName,
    String? descriptions,
    DateTime? startDate,
    DateTime? endDate,
    String? startTime,
    String? endTime,
    DateTime? lastRegDate,
    String? lastRegTime,
    DateTime? arriveDate,
    String? arriveTime,
    int? additionalGuests,
    String? extraRequirements,
    List<String>? eventImages,
    String? eventStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
    User? user,
    List<EventTicket>? eventTickets,
    List<EventTable>? eventTable,
    bool? isFavorite,
  }) => AllEventModel(
    id: id ?? this.id,
    eventName: eventName ?? this.eventName,
    descriptions: descriptions ?? this.descriptions,
    startDate: startDate ?? this.startDate,
    endDate: endDate ?? this.endDate,
    startTime: startTime ?? this.startTime,
    endTime: endTime ?? this.endTime,
    lastRegDate: lastRegDate ?? this.lastRegDate,
    lastRegTime: lastRegTime ?? this.lastRegTime,
    arriveDate: arriveDate ?? this.arriveDate,
    arriveTime: arriveTime ?? this.arriveTime,
    additionalGuests: additionalGuests ?? this.additionalGuests,
    extraRequirements: extraRequirements ?? this.extraRequirements,
    eventImages: eventImages ?? this.eventImages,
    eventStatus: eventStatus ?? this.eventStatus,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    user: user ?? this.user,
    eventTickets: eventTickets ?? this.eventTickets,
    eventTable: eventTable ?? this.eventTable,
    isFavorite: isFavorite ?? this.isFavorite,
  );

  factory AllEventModel.fromJson(Map<String, dynamic> json) => AllEventModel(
    id: json["id"],
    eventName: json["eventName"],
    descriptions: json["descriptions"],
    startDate: json["startDate"] == null
        ? null
        : DateTime.tryParse(json["startDate"].toString()),
    endDate: json["endDate"] == null
        ? null
        : DateTime.tryParse(json["endDate"].toString()),
    startTime: json["startTime"]?.toString(),
    endTime: json["endTime"]?.toString(),
    lastRegDate: json["lastRegDate"] == null
        ? null
        : DateTime.tryParse(json["lastRegDate"].toString()),
    lastRegTime: json["lastRegTime"]?.toString(),
    arriveDate: json["arriveDate"] == null
        ? null
        : DateTime.tryParse(json["arriveDate"].toString()),
    arriveTime: json["arriveTime"]?.toString(),
    additionalGuests: json["additionalGuests"] is int
        ? json["additionalGuests"]
        : null,
    extraRequirements: json["extraRequirements"]?.toString(),
    eventImages: _parseStringList(json["eventImages"]),
    eventStatus: json["eventStatus"]?.toString(),
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.tryParse(json["createdAt"].toString()),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.tryParse(json["updatedAt"].toString()),
    user: json["user"] == null
        ? null
        : User.fromJson(json["user"] as Map<String, dynamic>),
    eventTickets: json["eventTickets"] == null
        ? []
        : List<EventTicket>.from(
            (json["eventTickets"] as List).map(
              (x) => EventTicket.fromJson(x as Map<String, dynamic>),
            ),
          ),
    eventTable: json["eventTable"] == null
        ? []
        : List<EventTable>.from(
            (json["eventTable"] as List).map(
              (x) => EventTable.fromJson(x as Map<String, dynamic>),
            ),
          ),
    isFavorite: json["isFavorite"] is bool ? json["isFavorite"] : null,
  );

  // Helper method to safely parse string lists
  static List<String>? _parseStringList(dynamic value) {
    if (value == null) return null;
    if (value is! List) return null;

    final List<String> result = [];
    for (var item in value) {
      if (item is String) {
        result.add(item);
      }
      // Skip non-string items or convert if needed
    }
    return result.isEmpty ? null : result;
  }

  Map<String, dynamic> toJson() => {
    "id": id,
    "eventName": eventName,
    "descriptions": descriptions,
    "startDate": startDate?.toIso8601String(),
    "endDate": endDate?.toIso8601String(),
    "startTime": startTime,
    "endTime": endTime,
    "lastRegDate": lastRegDate?.toIso8601String(),
    "lastRegTime": lastRegTime,
    "arriveDate": arriveDate?.toIso8601String(),
    "arriveTime": arriveTime,
    "additionalGuests": additionalGuests,
    "extraRequirements": extraRequirements,
    "eventImages": eventImages == null
        ? []
        : List<dynamic>.from(eventImages!.map((x) => x)),
    "eventStatus": eventStatus,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "user": user?.toJson(),
    "eventTickets": eventTickets == null
        ? []
        : List<dynamic>.from(eventTickets!.map((x) => x.toJson())),
    "eventTable": eventTable == null
        ? []
        : List<dynamic>.from(eventTable!.map((x) => x.toJson())),
    "isFavorite": isFavorite,
  };
}

class EventTable {
  final String? id;
  final String? tableName;
  final String? tableDetails;
  final int? maxAdditionGuest;
  final int? minimumSpentAmount;
  final bool? isIncludedFoodBeverage;
  final List<String>? tableImages;
  final List<Charge>? tableCharges;

  EventTable({
    this.id,
    this.tableName,
    this.tableDetails,
    this.maxAdditionGuest,
    this.minimumSpentAmount,
    this.isIncludedFoodBeverage,
    this.tableImages,
    this.tableCharges,
  });

  EventTable copyWith({
    String? id,
    String? tableName,
    String? tableDetails,
    int? maxAdditionGuest,
    int? minimumSpentAmount,
    bool? isIncludedFoodBeverage,
    List<String>? tableImages,
    List<Charge>? tableCharges,
  }) => EventTable(
    id: id ?? this.id,
    tableName: tableName ?? this.tableName,
    tableDetails: tableDetails ?? this.tableDetails,
    maxAdditionGuest: maxAdditionGuest ?? this.maxAdditionGuest,
    minimumSpentAmount: minimumSpentAmount ?? this.minimumSpentAmount,
    isIncludedFoodBeverage:
        isIncludedFoodBeverage ?? this.isIncludedFoodBeverage,
    tableImages: tableImages ?? this.tableImages,
    tableCharges: tableCharges ?? this.tableCharges,
  );

  factory EventTable.fromJson(Map<String, dynamic> json) => EventTable(
    id: json["id"],
    tableName: json["tableName"]?.toString(),
    tableDetails: json["tableDetails"]?.toString(),
    maxAdditionGuest: json["maxAdditionGuest"],
    minimumSpentAmount: json["minimumSpentAmount"],
    isIncludedFoodBeverage: json["isIncludedFoodBeverage"],
    tableImages: json["tableImages"] == null
        ? []
        : List<String>.from(json["tableImages"]!.map((x) => x)),
    tableCharges: json["tableCharges"] == null
        ? []
        : List<Charge>.from(
            json["tableCharges"]!.map((x) => Charge.fromJson(x)),
          ),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "tableName": tableName,
    "tableDetails": tableDetails,
    "maxAdditionGuest": maxAdditionGuest,
    "minimumSpentAmount": minimumSpentAmount,
    "isIncludedFoodBeverage": isIncludedFoodBeverage,
    "tableImages": tableImages == null
        ? []
        : List<dynamic>.from(tableImages!.map((x) => x)),
    "tableCharges": tableCharges == null
        ? []
        : List<dynamic>.from(tableCharges!.map((x) => x.toJson())),
  };
}

class Charge {
  final String? id;
  final String? feeAmount;
  final String? feeName;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Charge({
    this.id,
    this.feeAmount,
    this.feeName,
    this.createdAt,
    this.updatedAt,
  });

  Charge copyWith({
    String? id,
    String? feeAmount,
    String? feeName,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => Charge(
    id: id ?? this.id,
    feeAmount: feeAmount ?? this.feeAmount,
    feeName: feeName ?? this.feeName,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );

  factory Charge.fromJson(Map<String, dynamic> json) => Charge(
    id: json["id"],
    feeAmount: json["feeAmount"],
    feeName: json["feeName"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "feeAmount": feeAmount,
    "feeName": feeName,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}

class EventTicket {
  final String? id;
  final int? maleAdmission;
  final int? femaleAdmission;
  final int? ticketLimitation;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<Charge>? ticketCharges;

  EventTicket({
    this.id,
    this.maleAdmission,
    this.femaleAdmission,
    this.ticketLimitation,
    this.createdAt,
    this.updatedAt,
    this.ticketCharges,
  });

  EventTicket copyWith({
    String? id,
    int? maleAdmission,
    int? femaleAdmission,
    int? ticketLimitation,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<Charge>? ticketCharges,
  }) => EventTicket(
    id: id ?? this.id,
    maleAdmission: maleAdmission ?? this.maleAdmission,
    femaleAdmission: femaleAdmission ?? this.femaleAdmission,
    ticketLimitation: ticketLimitation ?? this.ticketLimitation,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    ticketCharges: ticketCharges ?? this.ticketCharges,
  );

  factory EventTicket.fromJson(Map<String, dynamic> json) => EventTicket(
    id: json["id"],
    maleAdmission: json["maleAdmission"],
    femaleAdmission: json["femaleAdmission"],
    ticketLimitation: json["ticketLimitation"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
    ticketCharges: json["ticketCharges"] == null
        ? []
        : List<Charge>.from(
            json["ticketCharges"]!.map((x) => Charge.fromJson(x)),
          ),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "maleAdmission": maleAdmission,
    "femaleAdmission": femaleAdmission,
    "ticketLimitation": ticketLimitation,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "ticketCharges": ticketCharges == null
        ? []
        : List<dynamic>.from(ticketCharges!.map((x) => x.toJson())),
  };
}

class User {
  final String? id;
  final String? fullName;
  final String? fullAddress;
  final String? profileImage;
  final String? email;

  User({
    this.id,
    this.fullName,
    this.fullAddress,
    this.profileImage,
    this.email,
  });

  User copyWith({
    String? id,
    String? fullName,
    String? fullAddress,
    String? profileImage,
    String? email,
  }) => User(
    id: id ?? this.id,
    fullName: fullName ?? this.fullName,
    fullAddress: fullAddress ?? this.fullAddress,
    profileImage: profileImage ?? this.profileImage,
    email: email ?? this.email,
  );

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json["id"],
    fullName: json["fullName"],
    fullAddress: json["fullAddress"],
    profileImage: json["profileImage"],
    email: json["email"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullName": fullName,
    "fullAddress": fullAddress,
    "profileImage": profileImage,
    "email": email,
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
