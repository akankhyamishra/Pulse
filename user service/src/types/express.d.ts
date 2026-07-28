import { IUser } from "../model.js";

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}
