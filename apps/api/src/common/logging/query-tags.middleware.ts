import { withQueryTags } from '@prisma/sqlcommenter-query-tags';
import type { NextFunction, Request, Response } from 'express';

export function queryTagsMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  void withQueryTags({ requestId: String(req.id) }, async () => next());
}
