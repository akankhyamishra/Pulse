import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { IUser, User } from "./model.js";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Primary: httpOnly cookie (secure, XSS-proof)
    // Fallback: Authorization: Bearer <token> for API clients / mobile
    const token: string | undefined =
      req.cookies?.pulse_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!token) {
      res.status(401).json({ message: "Please login to continue" });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SEC as string
    ) as JwtPayload;

    if (!decoded?._id) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      res.status(401).json({ message: "Account not found" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Session expired — please login again" });
  }
};
