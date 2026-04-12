import { fileUploader } from "./../../../helpers/fileUploader";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import e, { Request } from "express";
import { EventStatus, EventTable, Prisma, TicketCharges } from "@prisma/client";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { eventSearchableFields, IEventFilterRequest } from "./Events.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";

const createIntoDb = async (req: Request) => {
  const files = req.files as any;
  const eventData = req.body.eventData ? JSON.parse(req.body.eventData) : null;
  const tableData = req.body.tableData ? JSON.parse(req.body.tableData) : null;
  const ticketData = req.body.ticketData
    ? JSON.parse(req.body.ticketData)
    : null;

  if (!files?.eventImages || !files?.tableImages) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing event or table images");
  }
  if (!eventData || !ticketData || !tableData?.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Missing event, ticket, or table data"
    );
  }

  const eventImageUrls = await Promise.all(
    files.eventImages.map((img: any) =>
      fileUploader.uploadToCloudinary(img).then((res) => res.Location)
    )
  );

  const tableImageUrls = await Promise.all(
    files.tableImages.map((img: any) =>
      fileUploader.uploadToCloudinary(img).then((res) => res.Location)
    )
  );

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.events.create({
      data: {
        eventName: eventData.eventName,
        descriptions: eventData.descriptions,
        userId:req.user.id,
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        lastRegDate: new Date(eventData.lastRegDate),
        lastRegTime: eventData.lastRegTime,
        arriveDate: new Date(eventData.arriveDate),
        arriveTime: eventData.arriveTime,
        additionalGuests: eventData.additionalGuests,
        extraRequirements: eventData.extraRequirements,
        eventImages: eventImageUrls,
      },
    });

    const eventTicket = await tx.eventTickets.create({
      data: {
        eventId: event.id,
        maleAdmission: ticketData.maleAdmission,
        femaleAdmission: ticketData.femaleAdmission,
        ticketLimitation: ticketData.ticketLimitation,
      },
    });

    if (ticketData.ticketCharges?.length) {
      await tx.ticketCharges.createMany({
        data: ticketData.ticketCharges.map((charge: any) => ({
          eventTicketId: eventTicket.id,
          feeName: charge.feeName,
          feeAmount: charge.feeAmount,
        })),
      });
    }

    for (const table of tableData) {
      const createdTable = await tx.eventTable.create({
        data: {
          tableName: table.tableName,
          tableDetails: table.tableDetails,
          maxAdditionGuest: table.maxAdditionGuest,
          minimumSpentAmount: table.minimumSpentAmount,
          isIncludedFoodBeverage: table.isIncludedFoodBeverage,
          tableImages: tableImageUrls,
          eventId: event.id,
        },
      });

      if (table.tableCharges?.length) {
        await tx.tableCharges.createMany({
          data: table.tableCharges.map((charge: any) => ({
            eventTableId: createdTable.id,
            feeName: charge.feeName,
            feeAmount: charge.feeAmount,
          })),
        });
      }
    }

    return event;
  });

  return result;
};
const getListFromDb = async (
  params: IEventFilterRequest,
  options: IPaginationOptions,
  userId: string
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;
  const andConditions: Prisma.EventsWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: eventSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => {
        let value = (filterData as any)[key];
        if (key === "role" && typeof value === "string") {
          value = value.toUpperCase();
        }
        return {
          [key]: {
            equals: value,
          },
        };
      }),
    });
  }

  const whereConditions: Prisma.EventsWhereInput = {
    AND: andConditions,
  };

  const events = await prisma.events.findMany({
    where: whereConditions,
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    select: {
      id: true,
      eventName: true,
      descriptions: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      lastRegDate: true,
      lastRegTime: true,
      arriveDate: true,
      arriveTime: true,
      additionalGuests: true,
      extraRequirements: true,
      eventImages: true,
      eventStatus: true,
      createdAt: true,
      updatedAt: true,
      user:{
        select:{
          id:true,
          fullName:true,
          fullAddress:true,
          profileImage:true,
          email:true,
        }
      },
      eventTickets: {
        select: {
          id: true,
          maleAdmission: true,
          femaleAdmission: true,
          ticketLimitation: true,
          createdAt: true,
          updatedAt: true,
          ticketCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      eventTable: {
        select: {
          id: true,
          tableName: true,
          tableDetails: true,
          maxAdditionGuest: true,
          minimumSpentAmount: true,
          isIncludedFoodBeverage: true,
          tableImages: true,
          tableCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.events.count({
    where: whereConditions,
  });

  // Fetch favorites for current user
  let favoriteIds = new Set<string>();
  if (userId) {
    const favorites = await prisma.eventFavorite.findMany({
      where: { userId },
      select: { eventId: true },
    });
    favoriteIds = new Set(favorites.map((fav) => fav.eventId));
  }

  // Add isFavorite flag
  const enrichedEvents = events.map((event) => ({
    ...event,
    isFavorite: favoriteIds.has(event.id),
  }));

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: enrichedEvents,
  };
};

const myEvent = async (
  params: IEventFilterRequest,
  options: IPaginationOptions,
  userId: string
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;
  const andConditions: Prisma.EventsWhereInput[] = [{userId}];

  if (searchTerm) {
    andConditions.push({
      OR: eventSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => {
        let value = (filterData as any)[key];
        if (key === "role" && typeof value === "string") {
          value = value.toUpperCase();
        }
        return {
          [key]: {
            equals: value,
          },
        };
      }),
    });
  }

  const whereConditions: Prisma.EventsWhereInput = {
    AND: andConditions,
  };

  const events = await prisma.events.findMany({
    where: whereConditions,
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    select: {
      id: true,
      eventName: true,
      descriptions: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      lastRegDate: true,
      lastRegTime: true,
      arriveDate: true,
      arriveTime: true,
      additionalGuests: true,
      extraRequirements: true,
      eventImages: true,
      eventStatus: true,
      createdAt: true,
      updatedAt: true,
      user:{
        select:{
          id:true,
          fullName:true,
          fullAddress:true,
          profileImage:true,
          email:true,
        }
      },
      eventTickets: {
        select: {
          id: true,
          maleAdmission: true,
          femaleAdmission: true,
          ticketLimitation: true,
          createdAt: true,
          updatedAt: true,
          ticketCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      eventTable: {
        select: {
          id: true,
          tableName: true,
          tableDetails: true,
          maxAdditionGuest: true,
          minimumSpentAmount: true,
          isIncludedFoodBeverage: true,
          tableImages: true,
          tableCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.events.count({
    where: whereConditions,
  });

  // Fetch favorites for current user
  let favoriteIds = new Set<string>();
  if (userId) {
    const favorites = await prisma.eventFavorite.findMany({
      where: { userId },
      select: { eventId: true },
    });
    favoriteIds = new Set(favorites.map((fav) => fav.eventId));
  }

  // Add isFavorite flag
  const enrichedEvents = events.map((event) => ({
    ...event,
    isFavorite: favoriteIds.has(event.id),
  }));

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: enrichedEvents,
  };
};

const tonightEvent=async()=>{
const tonightStart = new Date();
tonightStart.setUTCHours(18, 0, 0, 0); // 6 PM UTC

const tonightEnd = new Date();
tonightEnd.setUTCHours(23, 59, 59, 999); // 11:59 PM UTC

const tonightEvents = await prisma.events.findMany({
  where: {
    OR: [
      {
        startDate: {
          gte: tonightStart,
          lte: tonightEnd,
        },
      },
      {
        endDate: {
          gte: tonightStart,
          lte: tonightEnd,
        },
      },
    ],
  },
     select: {
      id: true,
      eventName: true,
      descriptions: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      lastRegDate: true,
      lastRegTime: true,
      arriveDate: true,
      arriveTime: true,
      additionalGuests: true,
      extraRequirements: true,
      eventImages: true,
      eventStatus: true,
      createdAt: true,
      updatedAt: true,
      user:{
        select:{
          id:true,
          fullName:true,
          fullAddress:true,
          profileImage:true,
          email:true,
        }
      },
      eventTickets: {
        select: {
          id: true,
          maleAdmission: true,
          femaleAdmission: true,
          ticketLimitation: true,
          createdAt: true,
          updatedAt: true,
          ticketCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      eventTable: {
        select: {
          id: true,
          tableName: true,
          tableDetails: true,
          maxAdditionGuest: true,
          minimumSpentAmount: true,
          isIncludedFoodBeverage: true,
          tableImages: true,
          tableCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
});
return tonightEvents
}
const getByIdFromDb = async (id: string, userId: string) => {
  const result = await prisma.events.findUnique({
    where: { id },
    select: {
      id: true,
      eventName: true,
      descriptions: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      lastRegDate: true,
      lastRegTime: true,
      arriveDate: true,
      arriveTime: true,
      additionalGuests: true,
      extraRequirements: true,
      eventImages: true,
      eventStatus: true,
      createdAt: true,
      updatedAt: true,
      user:{
        select:{
          id:true,
          fullName:true,
          fullAddress:true,
          profileImage:true,
          email:true,
        }
      },
      eventTickets: {
        select: {
          id: true,
          maleAdmission: true,
          femaleAdmission: true,
          ticketLimitation: true,
          createdAt: true,
          updatedAt: true,
          ticketCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      eventTable: {
        select: {
          id: true,
          tableName: true,
          tableDetails: true,
          maxAdditionGuest: true,
          minimumSpentAmount: true,
          isIncludedFoodBeverage: true,
          tableImages: true,
          tableCharges: {
            select: {
              id: true,
              feeAmount: true,
              feeName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
       _count: {
      select: {
        booking: true,
      },
    }
    },
  });

  // Check if user has favorited this event
  let isFavorite = false;
  if (userId) {
    const favorite = await prisma.eventFavorite.findFirst({
      where: { userId, eventId: id },
      select: { id: true },
    });
    isFavorite = !!favorite;
  }

  return {
    ...result,
    isFavorite,
  };
};

const updateIntoDb = async (req: Request) => {
  const id = req.params.id;
  const parseData = req.body.eventData ? JSON.parse(req.body.eventData) : null;
  const files = req.files as any;
  let uploadUrls: string[] = [];
  let combinedImages: string[] = [];
  const isExists = await prisma.events.findFirst({ where: { id: id } });
  if (!isExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "events not found");
  }
  if (files) {
    // const eventImage=files.eventImages
    uploadUrls = await Promise.all(
      files.eventImages.map((img: any) =>
        fileUploader.uploadToCloudinary(img).then((res) => res.Location)
      )
    );
  }

  if (parseData?.eventImages?.length > 0 || uploadUrls.length > 0) {
    combinedImages = [...(parseData?.eventImages || []), ...uploadUrls];
  }
  const update = await prisma.events.update({
    where: { id },
    data: {
      eventName: parseData?.eventName || isExists.eventName,
      descriptions: parseData?.descriptions || isExists.descriptions,
      startDate: parseData?.startDate
        ? new Date(parseData.startDate)
        : isExists.startDate,
      endDate: parseData?.endDate
        ? new Date(parseData.endDate)
        : isExists.endDate,
      startTime: parseData?.startTime || isExists.startTime,
      endTime: parseData?.endTime || isExists.endTime,
      lastRegDate: parseData?.lastRegDate
        ? new Date(parseData.lastRegDate)
        : isExists.lastRegDate,
      lastRegTime: parseData?.lastRegTime || isExists.lastRegTime,
      arriveDate: parseData?.arriveDate
        ? new Date(parseData.arriveDate)
        : isExists.arriveDate,
      arriveTime: parseData?.arriveTime || isExists.arriveTime,
      additionalGuests:
        typeof parseData?.additionalGuests === "number"
          ? parseData.additionalGuests
          : isExists.additionalGuests,
      extraRequirements:
        parseData?.extraRequirements || isExists.extraRequirements,
      eventImages:
        combinedImages?.length > 0 ? combinedImages : isExists.eventImages,
    },
  });
  return update;
};

const updateEventTicket = async (req: Request) => {
  const id = req.params.id;
  const data = req.body;
  const isExist = await prisma.eventTickets.findFirst({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "EventTickets not found");
  }

  const result = await prisma.eventTickets.update({
    where: { id: id },
    data: {
      maleAdmission: data.maleAdmission,
      femaleAdmission: data.femaleAdmission,
      ticketLimitation: data.ticketLimitation,
    },
  });
  return result;
};

const updateTicketCharges = async (req: Request) => {
  const id = req.params.id;
  const data = req.body;
  const isExist = await prisma.ticketCharges.findFirst({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "ticket not found");
  }

  const result = await prisma.ticketCharges.update({
    where: { id },
    data: {
      feeName: data.feeName,
      feeAmount: data.feeAmount,
    },
  });
  return result;
};

const updateEventTable = async (req: Request) => {
  const id = req.params.id;
  const isExist = await prisma.eventTable.findFirst({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "event table not found");
  }
  const data = req.body.tableData ? JSON.parse(req.body.tableData) : null;
  const files = req.files as any;
  let uploadUrls = [];

  if (files && files.tableImages.length > 0) {
    uploadUrls = await Promise.all(
      files.tableImages.map((img: any) =>
        fileUploader.uploadToCloudinary(img).then((res) => res.Location)
      )
    );
  }
  let combinedImages;
  if (data?.tableImages?.length > 0 || uploadUrls.length > 0) {
    combinedImages = [...(data?.tableImages || []), ...uploadUrls];
  }
  const result = await prisma.eventTable.update({
    where: { id },
    data: {
      tableName: data.tableName || isExist.tableName,
      tableDetails: data.tableDetails || isExist.tableDetails,
      maxAdditionGuest: data.maxAdditionGuest || isExist.maxAdditionGuest,
      minimumSpentAmount: data.minimumSpentAmount || isExist.minimumSpentAmount,
      isIncludedFoodBeverage:
        data.isIncludedFoodBeverage || isExist.isIncludedFoodBeverage,
      tableImages: combinedImages,
    },
  });
  return result;
};
const updateTableCharges = async (req: Request) => {
  const id = req.params.id;
  const data = req.body;
  const isExist = await prisma.tableCharges.findFirst({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "table charges  not found");
  }
  const result = await prisma.tableCharges.update({
    where: { id },
    data: { feeAmount: data.feeAmount, feeName: data.feeName },
  });
  return result;
};

const updataStatus = async (id: string, payload: { eventStatus: string }) => {
  const isExit = await prisma.events.findFirst({ where: { id } });
  if (!isExit) {
    throw new ApiError(httpStatus.NOT_FOUND, "event not found");
  }
  if (payload.eventStatus) {
    payload.eventStatus = payload.eventStatus.toUpperCase();
    if (
      !Object.values(EventStatus).includes(
        payload.eventStatus.toUpperCase() as EventStatus
      )
    ) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        "Invalid event status. Please use one of the accepted values: UPCOMING, ONGOING, COMPLETED,  REJECTED."
      );
    }
  }
  const result = await prisma.events.update({
    where: { id },
    data: { eventStatus: payload.eventStatus.toUpperCase() as EventStatus },
    select: { id: true, eventStatus: true },
  });
  return result;
};
const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.events.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};

export const eventsService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  updateEventTicket,
  updateTicketCharges,
  updateEventTable,
  updateTableCharges,
  updataStatus,
  tonightEvent,
  myEvent
};
