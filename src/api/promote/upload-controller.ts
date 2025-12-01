import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction, Request } from 'express';
import { handleFileUpload } from './upload-service';

export const uploadFile = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const filename = req.query.filename as string;
        
        if (!filename) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Filename query parameter is required',
            });
        }

        if (!req.body || req.body.length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'No file data provided',
            });
        }

        const data = await handleFileUpload(req.body, filename, req.headers['content-type'] || 'application/octet-stream');

        res.status(httpStatus.OK).json(data);
    }
);
