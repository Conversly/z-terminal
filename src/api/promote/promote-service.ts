import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import { and, eq, desc } from 'drizzle-orm';
import { productLaunches, chatBots as chatBotsTable } from '../../drizzle/schema';
import {
    ProductLaunchData,
    CreateProductLaunchInput,
    UpdateProductLaunchInput,
    UpvoteResponse,
    AddCommentInput,
    AddReplyInput,
    CommentUpvoteResponse,
    Comment,
} from './types';
import { createId } from '@paralleldrive/cuid2';

export const handleGetProductLaunch = async (
    productId: string
): Promise<ProductLaunchData> => {
    try {
        const product = await db
            .select()
            .from(productLaunches)
            .where(eq(productLaunches.id, productId))
            .limit(1)
            .then((r) => r[0]);

        if (!product) {
            throw new ApiError('Product launch not found', httpStatus.NOT_FOUND);
        }

        return product as ProductLaunchData;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error fetching product launch:', error);
        throw new ApiError('Error fetching product launch', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleCreateProductLaunch = async (
    userId: string,
    input: CreateProductLaunchInput
): Promise<ProductLaunchData> => {
    try {
        // Validate chatbot ownership if chatbotId is provided
        if (input.chatbotId) {
            const chatbot = await db
                .select()
                .from(chatBotsTable)
                .where(and(
                    eq(chatBotsTable.id, input.chatbotId),
                    eq(chatBotsTable.userId, userId)
                ))
                .limit(1)
                .then((r) => r[0]);

            if (!chatbot) {
                throw new ApiError('Chatbot not found or does not belong to user', httpStatus.BAD_REQUEST);
            }
        }

        const [product] = await db
            .insert(productLaunches)
            .values({
                userId,
                name: input.name,
                tagline: input.tagline,
                description: input.description,
                logoUrl: input.logoUrl,
                websiteUrl: input.websiteUrl,
                launchDate: input.launchDate ? new Date(input.launchDate) : undefined,
                chatbotId: input.chatbotId || null,
                tags: input.tags || [],
                keyFeatures: input.keyFeatures || [],
                theme: input.theme || {},
                media: input.media || [],
                team: input.team || [],
                announcement: input.announcement || {},
                countdown: input.countdown || {},
                socialLinks: input.socialLinks || {},
            })
            .returning();

        return product as ProductLaunchData;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error creating product launch:', error);
        throw new ApiError('Error creating product launch', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleUpdateProductLaunch = async (
    userId: string,
    productId: string,
    input: Partial<UpdateProductLaunchInput>
): Promise<ProductLaunchData> => {
    try {
        // Verify product ownership
        const existing = await db
            .select()
            .from(productLaunches)
            .where(and(
                eq(productLaunches.id, productId),
                eq(productLaunches.userId, userId)
            ))
            .limit(1)
            .then((r) => r[0]);

        if (!existing) {
            throw new ApiError('Product launch not found or does not belong to user', httpStatus.NOT_FOUND);
        }

        // Validate chatbot ownership if chatbotId is being updated
        if (input.chatbotId !== undefined && input.chatbotId !== null) {
            const chatbot = await db
                .select()
                .from(chatBotsTable)
                .where(and(
                    eq(chatBotsTable.id, input.chatbotId),
                    eq(chatBotsTable.userId, userId)
                ))
                .limit(1)
                .then((r) => r[0]);

            if (!chatbot) {
                throw new ApiError('Chatbot not found or does not belong to user', httpStatus.BAD_REQUEST);
            }
        }

        const updateData: any = {
            ...input,
        };

        // Convert timestamp strings to Date objects
        if (updateData.launchDate && typeof updateData.launchDate === 'string') {
            updateData.launchDate = new Date(updateData.launchDate);
        }

        // Remove timestamp fields that shouldn't be updated directly
        delete updateData.createdAt;
        
        // Set updatedAt to current time
        updateData.updatedAt = new Date();

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const [updated] = await db
            .update(productLaunches)
            .set(updateData)
            .where(eq(productLaunches.id, productId))
            .returning();

        return updated as ProductLaunchData;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error updating product launch:', error);
        throw new ApiError('Error updating product launch', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleUpvoteProduct = async (
    productId: string
): Promise<UpvoteResponse> => {
    try {
        const product = await db
            .select()
            .from(productLaunches)
            .where(eq(productLaunches.id, productId))
            .limit(1)
            .then((r) => r[0]);

        if (!product) {
            throw new ApiError('Product launch not found', httpStatus.NOT_FOUND);
        }

        const [updated] = await db
            .update(productLaunches)
            .set({ 
                likesCount: (product.likesCount || 0) + 1,
                updatedAt: new Date(),
            })
            .where(eq(productLaunches.id, productId))
            .returning();

        return { likesCount: updated.likesCount || 0 };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error upvoting product:', error);
        throw new ApiError('Error upvoting product', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleAddComment = async (
    productId: string,
    input: AddCommentInput
): Promise<Comment> => {
    try {
        const product = await db
            .select()
            .from(productLaunches)
            .where(eq(productLaunches.id, productId))
            .limit(1)
            .then((r) => r[0]);

        if (!product) {
            throw new ApiError('Product launch not found', httpStatus.NOT_FOUND);
        }

        const newComment: Comment = {
            id: createId(),
            author: input.author,
            content: input.content,
            createdAt: new Date().toISOString(),
            upvotes: 0,
            replies: [],
        };

        const currentComments = (product.comments as Comment[]) || [];
        const updatedComments = [...currentComments, newComment];

        await db
            .update(productLaunches)
            .set({ 
                comments: updatedComments,
                updatedAt: new Date(),
            })
            .where(eq(productLaunches.id, productId));

        return newComment;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error adding comment:', error);
        throw new ApiError('Error adding comment', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleAddReply = async (
    productId: string,
    commentId: string,
    input: AddReplyInput
): Promise<Comment> => {
    try {
        const product = await db
            .select()
            .from(productLaunches)
            .where(eq(productLaunches.id, productId))
            .limit(1)
            .then((r) => r[0]);

        if (!product) {
            throw new ApiError('Product launch not found', httpStatus.NOT_FOUND);
        }

        const comments = (product.comments as Comment[]) || [];
        
        const newReply: Comment = {
            id: createId(),
            author: input.author,
            content: input.content,
            createdAt: new Date().toISOString(),
            upvotes: 0,
            replies: [],
        };

        // Recursively find and add reply to the comment
        const addReplyToComment = (comments: Comment[]): boolean => {
            for (const comment of comments) {
                if (comment.id === commentId) {
                    comment.replies = [...(comment.replies || []), newReply];
                    return true;
                }
                if (comment.replies && comment.replies.length > 0) {
                    if (addReplyToComment(comment.replies)) {
                        return true;
                    }
                }
            }
            return false;
        };

        const found = addReplyToComment(comments);
        
        if (!found) {
            throw new ApiError('Comment not found', httpStatus.NOT_FOUND);
        }

        await db
            .update(productLaunches)
            .set({ 
                comments: comments,
                updatedAt: new Date(),
            })
            .where(eq(productLaunches.id, productId));

        return newReply;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error adding reply:', error);
        throw new ApiError('Error adding reply', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleUpvoteComment = async (
    productId: string,
    commentId: string
): Promise<CommentUpvoteResponse> => {
    try {
        const product = await db
            .select()
            .from(productLaunches)
            .where(eq(productLaunches.id, productId))
            .limit(1)
            .then((r) => r[0]);

        if (!product) {
            throw new ApiError('Product launch not found', httpStatus.NOT_FOUND);
        }

        const comments = (product.comments as Comment[]) || [];
        let upvoteCount = 0;

        // Recursively find and upvote the comment
        const upvoteComment = (comments: Comment[]): boolean => {
            for (const comment of comments) {
                if (comment.id === commentId) {
                    comment.upvotes = (comment.upvotes || 0) + 1;
                    upvoteCount = comment.upvotes;
                    return true;
                }
                if (comment.replies && comment.replies.length > 0) {
                    if (upvoteComment(comment.replies)) {
                        return true;
                    }
                }
            }
            return false;
        };

        const found = upvoteComment(comments);
        
        if (!found) {
            throw new ApiError('Comment not found', httpStatus.NOT_FOUND);
        }

        await db
            .update(productLaunches)
            .set({ 
                comments: comments,
                updatedAt: new Date(),
            })
            .where(eq(productLaunches.id, productId));

        return { upvotes: upvoteCount };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error upvoting comment:', error);
        throw new ApiError('Error upvoting comment', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleGetUserProducts = async (
    userId: string
): Promise<ProductLaunchData[]> => {
    try {
        const products = await db
            .select()
            .from(productLaunches)
            .where(eq(productLaunches.userId, userId));

        return products as ProductLaunchData[];
    } catch (error) {
        logger.error('Error fetching user products:', error);
        throw new ApiError('Error fetching user products', httpStatus.INTERNAL_SERVER_ERROR);
    }
};

export const handleGetAllProducts = async (): Promise<ProductLaunchData[]> => {
    try {
        const products = await db
            .select()
            .from(productLaunches)
            .orderBy(desc(productLaunches.launchDate));

        return products as ProductLaunchData[];
    } catch (error) {
        logger.error('Error fetching all products:', error);
        throw new ApiError('Error fetching all products', httpStatus.INTERNAL_SERVER_ERROR);
    }
};
