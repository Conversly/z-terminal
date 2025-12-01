import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
    getProductLaunch,
    createProductLaunch,
    updateProductLaunch,
    upvoteProduct,
    addComment,
    addReply,
    upvoteComment,
    getUserProducts,
    getAllProducts,
} from './promote-controller';
import {
    productIdSchema,
    commentIdSchema,
    createProductLaunchSchema,
    updateProductLaunchSchema,
    addCommentSchema,
    addReplySchema,
} from './promote-schema';
import { uploadFile } from './upload-controller';

const app = express.Router();

// Upload endpoint - handles binary file upload with filename query param
app.post('/upload', express.raw({ type: '*/*', limit: '50mb' }), uploadFile);

// Product CRUD
app.get('/', getAllProducts); // Get all products (public)
app.get('/my-products', auth, getUserProducts); // Get user's products (authenticated)
app.post('/', auth, validate('body', createProductLaunchSchema), createProductLaunch);
app.get('/:id', validate('params', productIdSchema), getProductLaunch);
app.put('/:id', auth, validate('params', productIdSchema), validate('body', updateProductLaunchSchema), updateProductLaunch);

// Interaction endpoints
app.post('/:id/upvote', validate('params', productIdSchema), upvoteProduct);
app.post('/:id/comment', validate('params', productIdSchema), validate('body', addCommentSchema), addComment);
app.post('/:id/comment/:commentId/reply', validate('params', commentIdSchema), validate('body', addReplySchema), addReply);
app.post('/:id/comment/:commentId/upvote', validate('params', commentIdSchema), upvoteComment);

export default app;
