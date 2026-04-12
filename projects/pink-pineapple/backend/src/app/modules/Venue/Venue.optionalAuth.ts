import { NextFunction, Request, Response } from "express";
import config from "../../../config";
import { Secret } from "jsonwebtoken";
import { jwtHelpers } from "../../../helpars/jwtHelpers";

/**
 * Optional auth middleware: if a valid token is present, decode and attach user.
 * If no token or invalid token, continue without user (public access).
 */
export const optionalAuth = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization;
    if (token) {
      const verifiedUser = jwtHelpers.verifyToken(
        token,
        config.jwt.jwt_secret as Secret
      );
      req.user = verifiedUser;
    }
  } catch {
    // Token invalid or expired — continue as unauthenticated
  }
  next();
};
