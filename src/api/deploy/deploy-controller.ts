import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction, Request } from 'express';
import { jwtReq } from '../../types';
import { 
	handleGetWidget, 
	handleUpsertWidget,
	handleGenerateApiKey,
	handleGetApiKey,
	handleGetAllowedDomains,
	handleAddAllowedDomain,
	handleGetWidgetExternal
} from './deploy-service';

export const getWidget = catchAsync(
	async (req: jwtReq, res: Response, next: NextFunction) => {
		const chatbotId = parseInt(req.query.chatbotId as string);
		const data = await handleGetWidget(req.user.userId as string, chatbotId);

		res.status(httpStatus.OK).json({
			success: true,
			data,
		});
	}
);

export const getWidgetExternal = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const chatbotId = parseInt(req.query.chatbotId as string);
		const data = await handleGetWidgetExternal(chatbotId);

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

export const generateApiKey = catchAsync(
	async (req: jwtReq, res: Response, next: NextFunction) => {
		const chatbotId = parseInt(req.query.chatbotId as string);
		const data = await handleGenerateApiKey(req.user.userId as string, chatbotId);

		res.status(httpStatus.OK).json({
			success: true,
			message: 'API key generated successfully',
			data,
		});
	}
);

export const getApiKey = catchAsync(
	async (req: jwtReq, res: Response, next: NextFunction) => {
		const chatbotId = parseInt(req.query.chatbotId as string);
		const data = await handleGetApiKey(req.user.userId as string, chatbotId);

		res.status(httpStatus.OK).json({
			success: true,
			data,
		});
	}
);

export const getAllowedDomains = catchAsync(
	async (req: jwtReq, res: Response, next: NextFunction) => {
		const chatbotId = parseInt(req.query.chatbotId as string);
		const data = await handleGetAllowedDomains(req.user.userId as string, chatbotId);

		res.status(httpStatus.OK).json({
			success: true,
			data,
		});
	}
);

export const addAllowedDomain = catchAsync(
	async (req: jwtReq, res: Response, next: NextFunction) => {
		const chatbotId = parseInt(req.body.chatbotId);
		const domain = req.body.domain;
		const data = await handleAddAllowedDomain(req.user.userId as string, chatbotId, domain);

		res.status(httpStatus.CREATED).json({
			success: true,
			message: 'Domain added successfully',
			data,
		});
	}
);

