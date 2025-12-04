import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';
import { put } from '@vercel/blob';

export const handleFileUpload = async (
    fileBuffer: Buffer,
    originalFilename: string,
    contentType: string
): Promise<{
    url: string;
    pathname: string;
    contentType: string;
    contentDisposition: string;
}> => {
    try {
        // Validate file type (images and videos only)
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/quicktime',
            'application/octet-stream' // Allow binary for flexibility
        ];

        if (!allowedMimeTypes.includes(contentType)) {
            throw new ApiError(
                'Invalid file type. Only images and videos are allowed.',
                httpStatus.BAD_REQUEST
            );
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (fileBuffer.length > maxSize) {
            throw new ApiError('File size exceeds 50MB limit', httpStatus.BAD_REQUEST);
        }

        // Generate unique filename while preserving extension
        const fileExtension = path.extname(originalFilename);
        const uniqueId = createId();
        const fileName = `${uniqueId}${fileExtension}`;

        // Upload to Vercel Blob
        logger.info('Uploading to Vercel Blob:', fileName);

        const blob = await put(fileName, fileBuffer, {
            access: 'public',
            contentType: contentType,
            addRandomSuffix: false,
        });

        return {
            url: blob.url,
            pathname: blob.pathname,
            contentType: contentType,
            contentDisposition: `inline; filename="${originalFilename}"`,
        };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error uploading file:', error);
        throw new ApiError('Error uploading file', httpStatus.INTERNAL_SERVER_ERROR);
    }
};
