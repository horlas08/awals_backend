import type { Response } from "express";

export type TCode = 200 | 201 | 400 | 404 | 401 | 500;


export const response = ({ res, code, msg, success, data }: { res: Response, msg: string, code: TCode, success: boolean, data?: any }) => res.status(code).json({ msg, code, success, data });

// export const error = ({ res, code, msg, success }: { res: Response, msg: string, code: TCode, success: boolean }) => res.json({ msg, code, success });