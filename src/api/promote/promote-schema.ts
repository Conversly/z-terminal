import * as yup from 'yup';

export const productIdSchema = yup.object().shape({
    id: yup.string().required('Product ID is required'),
});

export const commentIdSchema = yup.object().shape({
    id: yup.string().required('Product ID is required'),
    commentId: yup.string().required('Comment ID is required'),
});

export const createProductLaunchSchema = yup.object().shape({
    name: yup.string().required('Product name is required').max(255),
    tagline: yup.string().max(500),
    description: yup.string(),
    logoUrl: yup.string().url('Invalid logo URL'),
    websiteUrl: yup.string().url('Invalid website URL'),
    launchDate: yup.date(),
    chatbotId: yup.string().nullable(),
    tags: yup.array().of(yup.string()),
    keyFeatures: yup.array().of(yup.string()),
    theme: yup.object().shape({
        primaryColor: yup.string(),
        backgroundColor: yup.string(),
        textColor: yup.string(),
        fontFamily: yup.string(),
        layout: yup.string(),
        heroStyle: yup.string(),
        cardStyle: yup.string(),
        accentColor: yup.string(),
        gradient: yup.string(),
    }),
    media: yup.array().of(
        yup.object().shape({
            id: yup.string().required(),
            type: yup.string().oneOf(['image', 'video']).required(),
            url: yup.string().url().required(),
            thumbnailUrl: yup.string().url(),
            alt: yup.string(),
        })
    ),
    team: yup.array().of(
        yup.object().shape({
            id: yup.string().required(),
            name: yup.string().required(),
            role: yup.string().required(),
            avatarUrl: yup.string().url(),
            socials: yup.object().shape({
                twitter: yup.string().url(),
                linkedin: yup.string().url(),
                github: yup.string().url(),
                website: yup.string().url(),
            }),
        })
    ),
    announcement: yup.object().shape({
        enabled: yup.boolean(),
        text: yup.string(),
        link: yup.string().url(),
        emoji: yup.string(),
        backgroundColor: yup.string(),
        textColor: yup.string(),
        showCountdown: yup.boolean(),
    }),
    countdown: yup.object().shape({
        enabled: yup.boolean(),
        targetDate: yup.string(),
        title: yup.string(),
    }),
    socialLinks: yup.object().shape({
        twitter: yup.string().url(),
        github: yup.string().url(),
        discord: yup.string().url(),
        youtube: yup.string().url(),
        website: yup.string().url(),
    }),
});

export const updateProductLaunchSchema = yup.object().shape({
    name: yup.string().max(255),
    tagline: yup.string().max(500),
    description: yup.string(),
    logoUrl: yup.string().url('Invalid logo URL'),
    websiteUrl: yup.string().url('Invalid website URL'),
    launchDate: yup.date(),
    chatbotId: yup.string().nullable(),
    tags: yup.array().of(yup.string()),
    keyFeatures: yup.array().of(yup.string()),
    theme: yup.object(),
    media: yup.array(),
    team: yup.array(),
    announcement: yup.object(),
    countdown: yup.object(),
    socialLinks: yup.object(),
});

export const addCommentSchema = yup.object().shape({
    content: yup.string().required('Comment content is required').max(2000),
    author: yup.object().shape({
        name: yup.string().required('Author name is required'),
        avatarUrl: yup.string().url(),
        username: yup.string(),
        isMaker: yup.boolean(),
        badge: yup.string(),
    }).required(),
});

export const addReplySchema = yup.object().shape({
    content: yup.string().required('Reply content is required').max(2000),
    author: yup.object().shape({
        name: yup.string().required('Author name is required'),
        avatarUrl: yup.string().url(),
        username: yup.string(),
        isMaker: yup.boolean(),
        badge: yup.string(),
    }).required(),
});
