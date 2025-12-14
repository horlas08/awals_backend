

import { type Request, type Response } from "express";
import { UserService } from "./user.services.js";
import { response } from "../../utils/req-res.js";

export class UserController {

  static async getUserById(req: Request, res: Response) {
    try {
      await UserService.getUserById(res, req.params.id as string);
      // return res.json({ success: true, data: user });
    } catch (err: any) {
      return response({ res, code: 400, msg: err?.message, success: false })
    }
  }


  static async getUserByEmail(req: Request, res: Response) {
    try {
      const user = await UserService.getUserByEmail(req.params.email as string);
      return res.json({ success: true, data: user });
    } catch (err: any) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }


  static async updateUser(req: Request & { userId?: string }, res: Response) {
    const userId = req?.userId;

    // const editableFeilds = ['name', 'phone', 'role', 'picture'];

    try {
      await UserService.updateUser(res, userId as string, req.body);
      // return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }


  static async deleteUser(req: Request & { userId?: string }, res: Response) {
    const userId = req?.userId;

    try {
      await UserService.updateUser(res, userId as string, { deleted: true });
      // return res.json({ success: true, data: deleted });
    } catch (err: any) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }


  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserService.getAllUsers();
      return res.json({ success: true, data: users });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
