import {
  ExpressErrorMiddlewareInterface,
  Middleware
} from "routing-controllers";
import { Request, Response, NextFunction } from "express";

@Middleware({ type: "after" })
export class GlobalErrorHandler implements ExpressErrorMiddlewareInterface {
  error(error: any, req: Request, res: Response, next: NextFunction) {
    console.error("🔥 GlobalErrorHandler caught:", error);

    // VERY IMPORTANT: If response already sent, do nothing
    if (res.headersSent) {
      return next(error);
    }

    const status = error.httpCode || 500;

    return res.status(status).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
}
