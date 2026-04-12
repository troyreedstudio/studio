import prisma from "../../../shared/prisma";
import { BookingType, UserStatus, BookingStatus, Prisma } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IBookingFilterRequest } from "./Booking.interface";

type CreateBookingPayload = {
  bookingType: BookingType;
  guest: number;
  status: BookingStatus;
  numberOfFemale: number;
  numberOfMale: number;
  paidAmount: number;
  eventId: string;
  tableId?: string | null;
  ticketId?: string | null;
};
const createIntoDb = async (data: CreateBookingPayload, userId: string) => {
  const dbData = { ...data, userId };
  if (data.tableId) {
    const isExist = await prisma.eventTable.findFirst({
      where: { id: data.tableId },
    });
    if (!isExist) {
      throw new ApiError(httpStatus.NOT_FOUND, "Table not found");
    }
  }

  if (data.eventId) {
    const isExistEvent = await prisma.events.findFirst({
      where: { id: data.eventId },
    });
    if (!isExistEvent) {
      throw new ApiError(httpStatus.NOT_FOUND, "event not found");
    }
  }
  if (data.ticketId) {
    const isExistTicket = await prisma.eventTickets.findFirst({
      where: { id: data.ticketId },
    });
    if (!isExistTicket) {
      throw new ApiError(httpStatus.NOT_FOUND, "ticket not found.");
    }
  }
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.booking.create({ data: { ...dbData } });
    return result;
  });

  return transaction;
};

const getListFromDb = async (
  params: IBookingFilterRequest, 
  options: IPaginationOptions,
  userId: string
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, status, eventName, ...filterData } = params;

  // Initialize the conditions for filtering
  const andConditions: Prisma.BookingWhereInput[] = [];

  // Filter by status if provided
  if (status) {
    andConditions.push({ status: status.toUpperCase() as BookingStatus });
  }

  // Filter by eventName if provided (search term in event name)
  if (eventName) {
    andConditions.push({
      event: {
        eventName: {
          contains: eventName,
          mode: 'insensitive',
        },
      },
    });
  }

  // If there are other filter criteria, apply them
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => {
        let value = (filterData as any)[key];
        return {
          [key]: {
            equals: value,
          },
        };
      }),
    });
  }

  const whereConditions: Prisma.BookingWhereInput = { AND: andConditions };

  // Fetch the list of bookings with pagination
  const bookings = await prisma.booking.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      tableId: true,
      ticketId: true,
      eventId: true,
      guest: true,
      bookingType: true,
      status: true,
      numberOfFemale: true,
      numberOfMale: true,
      paidAmount: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          fullAddress: true,
          fullName: true,
          profileImage: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          eventName: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      table: {
        select: {
          id: true,
          tableName: true,
          tableImages: true,
          tableDetails: true,
        },
      },
      ticket: {
        select: {
          id: true,
        },
      },
    },
  });

  // Count the total number of bookings for pagination
  const total = await prisma.booking.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: bookings,
  };
};

const getMyBooking = async (userId: string, status?: string) => {
  const result = await prisma.booking.findMany({
    where: {
      userId,
      ...(status ? { status: status.toUpperCase() as BookingStatus } : {}),
    },
    select: {
      id: true,
      userId: true,
      tableId: true,
      ticketId: true,
      eventId: true,
      guest: true,
      bookingType: true,
      status: true,
      numberOfFemale: true,
      numberOfMale: true,
      paidAmount: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          fullAddress: true,
          fullName: true,
          profileImage: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          eventName: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      table: {
        select: {
          id: true,
          tableName: true,
          tableImages: true,
          tableDetails: true,
        },
      },
      ticket: {
        select: {
          id: true,
        },
      },
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      tableId: true,
      ticketId: true,
      eventId: true,
      guest: true,
      bookingType: true,
      status: true,
      numberOfFemale: true,
      numberOfMale: true,
      paidAmount: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          fullAddress: true,
          fullName: true,
          profileImage: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          eventName: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      table: {
        select: {
          id: true,
          tableName: true,
          tableImages: true,
          tableDetails: true,
        },
      },
      ticket: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!result) {
    // throw new Error('booking not found');
    throw new ApiError(httpStatus.NOT_FOUND, "booking not found");
  }
  return result;
};

type UpdateBookingPayload = {
  status?: BookingStatus;
  guest?: number;
  numberOfFemale?: number;
  numberOfMale?: number;
  paidAmount?: number;
};

const updateIntoDb = async (id: string, data: UpdateBookingPayload) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.booking.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.booking.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};

const updateStatus = async (data: {
  bookingId: string;
  status: BookingStatus;
}) => {
  const isExist = await prisma.booking.findFirst({
    where: { id: data.bookingId },
  });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, " booking not found");
  }

  data.status = data.status.toUpperCase() as BookingStatus;
  const update = await prisma.booking.update({
    where: { id: data.bookingId },
    data: { status: data.status },
  });

  return update;
};
export const bookingService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  updateStatus,
  getMyBooking,
};
