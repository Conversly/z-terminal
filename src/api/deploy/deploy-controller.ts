import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import { handleGetWidget, handleUpsertWidget } from './deploy-service';

export const getWidget = catchAsync(
	async (req: jwtReq, res: Response, next: NextFunction) => {
		const chatbotId = parseInt(req.params.chatbotId);
		const data = await handleGetWidget(req.user.userId as string, chatbotId);

		res.status(httpStatus.OK).json({
			success: true,
			data,
		});
	}
);

export const upsertWidget = catchAsync(
	async (req: jwtReq, res: Response, next: NextFunction) => {
		const data = await handleUpsertWidget(req.user.userId as string, req.body);

		res.status(httpStatus.OK).json({
			success: true,
			message: 'Widget configuration saved',
			data,
		});
	}
);

