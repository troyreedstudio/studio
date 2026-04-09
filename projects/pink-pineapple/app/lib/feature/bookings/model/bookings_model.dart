

class BookingsListModel {
  final String? id;
  final String? userId;
  final String? tableId;
  final dynamic ticketId;
  final String? eventId;
  final int? guest;
  final String? bookingType;
  final String? status;
  final int? numberOfFemale;
  final int? numberOfMale;
  final int? paidAmount;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final User? user;
  final Event? event;
  final Table? table;
  final dynamic ticket;

  BookingsListModel({
    this.id,
    this.userId,
    this.tableId,
    this.ticketId,
    this.eventId,
    this.guest,
    this.bookingType,
    this.status,
    this.numberOfFemale,
    this.numberOfMale,
    this.paidAmount,
    this.createdAt,
    this.updatedAt,
    this.user,
    this.event,
    this.table,
    this.ticket,
  });

  BookingsListModel copyWith({
    String? id,
    String? userId,
    String? tableId,
    dynamic ticketId,
    String? eventId,
    int? guest,
    String? bookingType,
    String? status,
    int? numberOfFemale,
    int? numberOfMale,
    int? paidAmount,
    DateTime? createdAt,
    DateTime? updatedAt,
    User? user,
    Event? event,
    Table? table,
    dynamic ticket,
  }) =>
      BookingsListModel(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        tableId: tableId ?? this.tableId,
        ticketId: ticketId ?? this.ticketId,
        eventId: eventId ?? this.eventId,
        guest: guest ?? this.guest,
        bookingType: bookingType ?? this.bookingType,
        status: status ?? this.status,
        numberOfFemale: numberOfFemale ?? this.numberOfFemale,
        numberOfMale: numberOfMale ?? this.numberOfMale,
        paidAmount: paidAmount ?? this.paidAmount,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        user: user ?? this.user,
        event: event ?? this.event,
        table: table ?? this.table,
        ticket: ticket ?? this.ticket,
      );

  factory BookingsListModel.fromJson(Map<String, dynamic> json) => BookingsListModel(
    id: json["id"],
    userId: json["userId"],
    tableId: json["tableId"],
    ticketId: json["ticketId"],
    eventId: json["eventId"],
    guest: json["guest"],
    bookingType: json["bookingType"],
    status: json["status"],
    numberOfFemale: json["numberOfFemale"],
    numberOfMale: json["numberOfMale"],
    paidAmount: json["paidAmount"],
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
    user: json["user"] == null ? null : User.fromJson(json["user"]),
    event: json["event"] == null ? null : Event.fromJson(json["event"]),
    table: json["table"] == null ? null : Table.fromJson(json["table"]),
    ticket: json["ticket"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "userId": userId,
    "tableId": tableId,
    "ticketId": ticketId,
    "eventId": eventId,
    "guest": guest,
    "bookingType": bookingType,
    "status": status,
    "numberOfFemale": numberOfFemale,
    "numberOfMale": numberOfMale,
    "paidAmount": paidAmount,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "user": user?.toJson(),
    "event": event?.toJson(),
    "table": table?.toJson(),
    "ticket": ticket,
  };
}

class Event {
  final String? id;
  final String? eventName;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Event({
    this.id,
    this.eventName,
    this.startDate,
    this.endDate,
    this.createdAt,
    this.updatedAt,
  });

  Event copyWith({
    String? id,
    String? eventName,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      Event(
        id: id ?? this.id,
        eventName: eventName ?? this.eventName,
        startDate: startDate ?? this.startDate,
        endDate: endDate ?? this.endDate,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  factory Event.fromJson(Map<String, dynamic> json) => Event(
    id: json["id"],
    eventName: json["eventName"],
    startDate: json["startDate"] == null ? null : DateTime.parse(json["startDate"]),
    endDate: json["endDate"] == null ? null : DateTime.parse(json["endDate"]),
    createdAt: json["createdAt"] == null ? null : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null ? null : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "eventName": eventName,
    "startDate": startDate?.toIso8601String(),
    "endDate": endDate?.toIso8601String(),
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}

class Table {
  final String? id;
  final String? tableName;
  final List<String>? tableImages;
  final String? tableDetails;

  Table({
    this.id,
    this.tableName,
    this.tableImages,
    this.tableDetails,
  });

  Table copyWith({
    String? id,
    String? tableName,
    List<String>? tableImages,
    String? tableDetails,
  }) =>
      Table(
        id: id ?? this.id,
        tableName: tableName ?? this.tableName,
        tableImages: tableImages ?? this.tableImages,
        tableDetails: tableDetails ?? this.tableDetails,
      );

  factory Table.fromJson(Map<String, dynamic> json) => Table(
    id: json["id"],
    tableName: json["tableName"],
    tableImages: json["tableImages"] == null ? [] : List<String>.from(json["tableImages"]!.map((x) => x)),
    tableDetails: json["tableDetails"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "tableName": tableName,
    "tableImages": tableImages == null ? [] : List<dynamic>.from(tableImages!.map((x) => x)),
    "tableDetails": tableDetails,
  };
}

class User {
  final String? id;
  final String? fullAddress;
  final String? fullName;
  final String? profileImage;
  final String? email;

  User({
    this.id,
    this.fullAddress,
    this.fullName,
    this.profileImage,
    this.email,
  });

  User copyWith({
    String? id,
    String? fullAddress,
    String? fullName,
    String? profileImage,
    String? email,
  }) =>
      User(
        id: id ?? this.id,
        fullAddress: fullAddress ?? this.fullAddress,
        fullName: fullName ?? this.fullName,
        profileImage: profileImage ?? this.profileImage,
        email: email ?? this.email,
      );

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json["id"],
    fullAddress: json["fullAddress"],
    fullName: json["fullName"],
    profileImage: json["profileImage"],
    email: json["email"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "fullAddress": fullAddress,
    "fullName": fullName,
    "profileImage": profileImage,
    "email": email,
  };
}
