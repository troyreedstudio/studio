import { Prisma, User, UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import crypto from "crypto";
import { Request } from "express";
import httpStatus from "http-status";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { fileUploader } from "../../../helpars/fileUploader";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { generateOtpEmail } from "../../../shared/emaiHTMLtext";
import emailSender from "../../../shared/emailSender";
import prisma from "../../../shared/prisma";
import { userSearchAbleFields } from "./user.costant";
import { IUser, IUserFilterRequest } from "./user.interface";
import { object } from "zod";

// Create a new user in the database.
const createUserIntoDb = async (payload: User) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  });

  const otp = Number(crypto.randomInt(1000, 9999));
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  if (existingUser) {
    if (existingUser.status === UserStatus.ACTIVE) {
      throw new ApiError(
        400,
        `User with email ${payload.email} is already active.`
      );
    }

    if (existingUser.status === UserStatus.INACTIVE) {
      const updatedData: Record<string, any> = {
        status: "INACTIVE",
        expirationOtp: otpExpires,
        otp,
      };

      if (payload.password) {
        const hashedPassword = await bcrypt.hash(
          payload.password,
          Number(config.bcrypt_salt_rounds)
        );
        updatedData.password = hashedPassword;
      }

      if (payload.fcmToken) {
        updatedData.fcmToken = payload.fcmToken;
      }

      if (payload.role) {
        updatedData.role = payload.role;
      }

      const result = await prisma.user.update({
        where: { id: existingUser.id },
        data: updatedData,
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          otp: true,
        },
      });
      const html = generateOtpEmail(otp);
      await emailSender(payload.email, html, "OTP Verification");

      console.log("otp", otp);
      return {
        message:
          "An OTP has been sent to your email. Please verify your account.",
        data: result,
      };
    }
  }

  if (!payload.password) {
    throw new ApiError(400, "Password is required");
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds)
  );

  const newUser = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      username: payload.username,
      email: payload.email,
      fullAddress: payload.fullAddress,
      profilePrivacy: payload.profilePrivacy,
      bio: payload.bio,
      phoneNumber: payload.phoneNumber,
      password: hashedPassword,
      dob: payload.dob,
      role: payload.role,
      typeOfVenue: payload.typeOfVenue,
      fcmToken: payload.fcmToken,
      otp: otp,
      expirationOtp: otpExpires,
    },

    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      otp: true,
    },
  });
  if (!newUser) {
    throw new ApiError(500, "Failed to create user");
  }

  const html = generateOtpEmail(otp);
  await emailSender(payload.email, html, "OTP Verification");

  console.log("otp", otp);
  return {
    message: "An OTP has been sent to your email. Please verify your account.",
    data: newUser,
  };
};

// reterive all users from the database also searcing anf filetering
const getUsersFromDb = async (
  params: IUserFilterRequest,
  options: IPaginationOptions,
  userId: string
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.UserWhereInput[] = [
    { role: { not: UserRole.ADMIN }, },
    { id: { not: userId }, },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: userSearchAbleFields.map((field) => ({
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
          if (!Object.values(UserRole).includes(value)) {
            throw new ApiError(
              httpStatus.NOT_FOUND,
              "You can't use a role outside this scope"
            );
          }
        }
        return {
          [key]: {
            equals: value,
          },
        };
      }),
    });
  }

  const whereConditions: Prisma.UserWhereInput = { AND: andConditions };

  const users = await prisma.user.findMany({
    where: whereConditions,
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      fullAddress: true,
      status: true,
      isApproved: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  // Fetch favorites for current user
  const favorites = await prisma.clubFavorite.findMany({
    where: { userId },
    select: { clubId: true },
  });

  const favoriteIds = new Set(favorites.map((fav) => fav.clubId));

  // Add isFavorite flag
  const enrichedUsers = users.map((user) => ({
    ...user,
    isFavorite: favoriteIds.has(user?.id),
  }));

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: enrichedUsers,
  };
};


const updateProfile = async (req: Request) => {


  const files = req.files as any;
  const profileImage = files.profile;
  const licenseImage = files.license;
  // console.log(profileImage,licenseImage);

  const stringData = req.body.data;
  let uploadedProfileImage;
  let uploadedLicenseImage;
  let parseData;

  // Normalize various DOB inputs into a consistent ISO-compatible Date for Prisma
  const normalizeDob = (input: any): Date | undefined => {
    if (!input) return undefined;
    if (input instanceof Date) return input;
    if (typeof input === "string") {
      const s = input.trim();
      // Handle YYYY-MM-DD explicitly (Safari/iOS-safe by adding UTC midnight)
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(`${s}T00:00:00.000Z`);
      }
      // Handle MM/DD/YYYY
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) {
        const month = parseInt(m[1], 10) - 1;
        const day = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        return new Date(Date.UTC(year, month, day));
      }
      // Fallback to native parsing
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    return undefined;
  };

  const existingUser = await prisma.user.findFirst({
    where: {
      id: req.user.id,
    },
  });
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }
  if (profileImage) {
    uploadedProfileImage = (
      await fileUploader.uploadToCloudinary(profileImage[0])
    ).Location;
  }
  if (licenseImage) {
    uploadedLicenseImage = (
      await fileUploader.uploadToCloudinary(licenseImage[0])
    ).Location;
  }
  if (stringData) {
    parseData = JSON.parse(stringData);
  }
  // Ensure parseData is at least an object to prevent property access errors
  parseData = parseData || {};

  // Prepare normalized DOB (iOS/ISO-safe) if provided
  const dobToSave = normalizeDob(parseData.dob);
  const result = await prisma.user.update({
    where: {
      id: existingUser.id, // Ensure `existingUser.id` is valid and exists
    },
    data: {
      fullName: parseData.fullName || existingUser.fullName,
      email: parseData.email || existingUser.email,
      username: parseData.username || existingUser.username,
      dob: dobToSave || existingUser.dob,
      profilePrivacy: parseData.profilePrivacy || existingUser.profilePrivacy,
      fullAddress: parseData.fullAddress || existingUser.fullAddress,
      isCompleteProfile:parseData.isCompleteProfile|| existingUser.isCompleteProfile,
      bio: parseData.bio || existingUser.bio,
      phoneNumber: parseData.phoneNumber || existingUser.phoneNumber,
      profileImage: uploadedProfileImage || existingUser.profileImage,
      typeOfVenue: parseData.typeOfVenue || existingUser.typeOfVenue,
      taxId: parseData.taxId || existingUser.taxId,
      businessLicense: uploadedLicenseImage || existingUser.businessLicense,
      updatedAt: new Date(), // Assuming your model has an `updatedAt` field
    },
    select: {
      fullName: parseData.fullName ? true : false,
      email: parseData.email ? true : false,
      username: parseData.username ? true : false,
      dob: parseData.dob ? true : false,
      profilePrivacy: parseData.profilePrivacy ? true : false,
      fullAddress: parseData.fullAddress ? true : false,
      bio: parseData.bio ? true : false,
      phoneNumber: parseData.phoneNumber ? true : false,
      profileImage: uploadedProfileImage ? true : false,
      typeOfVenue: parseData.typeOfVenue ? true : false,
      taxId: parseData.taxId ? true : false,
      businessLicense: uploadedLicenseImage ? true : false,
      updatedAt: new Date() ? true : false,
    },
  });

  return result;
};

// update user data into database by id fir admin
const updateUserIntoDb = async (payload: IUser, id: string) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
    where: {
      id: id,
    },
  });
  if (!userInfo)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found with id: " + id);

  const result = await prisma.user.update({
    where: {
      id: userInfo.id,
    },
    data: payload,
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      status:true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!result)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update user profile"
    );

  return result;
};


export const userService = {
  createUserIntoDb,
  getUsersFromDb,
  updateProfile,
  updateUserIntoDb,
};
