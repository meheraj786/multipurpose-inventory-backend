import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";

const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      req.body = parsedData.body;
      req.params = parsedData.params;
      if (parsedData.query) {
        req.body._query = parsedData.query;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
