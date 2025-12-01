import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
    handleGetProductLaunch,
    handleCreateProductLaunch,
    handleUpdateProductLaunch,
    handleUpvoteProduct,
    handleAddComment,
    handleAddReply,
    handleUpvoteComment,
    handleGetUserProducts,
    handleGetAllProducts,
} from './promote-service';

export const getProductLaunch = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const data = await handleGetProductLaunch(id);

        res.status(httpStatus.OK).json({
            success: true,
            data,
        });
    }
);

export const createProductLaunch = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const data = await handleCreateProductLaunch(req.user.userId as string, req.body);

        res.status(httpStatus.CREATED).json({
            success: true,
            message: 'Product launch created successfully',
            data,
        });
    }
);

export const updateProductLaunch = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const data = await handleUpdateProductLaunch(req.user.userId as string, id, req.body);

        res.status(httpStatus.OK).json({
            success: true,
            message: 'Product launch updated successfully',
            data,
        });
    }
);

export const upvoteProduct = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const data = await handleUpvoteProduct(id);

        res.status(httpStatus.OK).json({
            success: true,
            data,
        });
    }
);

export const addComment = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const data = await handleAddComment(id, req.body);

        res.status(httpStatus.CREATED).json({
            success: true,
            message: 'Comment added successfully',
            data,
        });
    }
);

export const addReply = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const { id, commentId } = req.params;
        const data = await handleAddReply(id, commentId, req.body);

        res.status(httpStatus.CREATED).json({
            success: true,
            message: 'Reply added successfully',
            data,
        });
    }
);

export const upvoteComment = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const { id, commentId } = req.params;
        const data = await handleUpvoteComment(id, commentId);

        res.status(httpStatus.OK).json({
            success: true,
            data,
        });
    }
);

export const getUserProducts = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const data = await handleGetUserProducts(req.user.userId as string);

        res.status(httpStatus.OK).json({
            success: true,
            data,
        });
    }
);

export const getAllProducts = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const data = await handleGetAllProducts();

        res.status(httpStatus.OK).json({
            success: true,
            data,
        });
    }
);
