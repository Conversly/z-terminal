export interface ProductTheme {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    layout?: string;
    heroStyle?: string;
    cardStyle?: string;
    accentColor?: string;
    gradient?: string;
}

export interface MediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    alt?: string;
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string;
    socials?: {
        twitter?: string;
        linkedin?: string;
        github?: string;
        website?: string;
    };
}

export interface CommentAuthor {
    name: string;
    avatarUrl?: string;
    username?: string;
    isMaker?: boolean;
    badge?: string;
}

export interface Comment {
    id: string;
    author: CommentAuthor;
    content: string;
    createdAt: string;
    upvotes: number;
    replies: Comment[];
}

export interface Announcement {
    enabled?: boolean;
    text?: string;
    link?: string;
    emoji?: string;
    backgroundColor?: string;
    textColor?: string;
    showCountdown?: boolean;
}

export interface Countdown {
    enabled?: boolean;
    targetDate?: string;
    title?: string;
}

export interface SocialLinks {
    twitter?: string;
    github?: string;
    discord?: string;
    youtube?: string;
    website?: string;
}

export interface ProductLaunchData {
    id?: string;
    userId?: string;
    name: string;
    tagline?: string;
    description?: string;
    logoUrl?: string;
    websiteUrl?: string;
    launchDate?: Date | string;
    chatbotId?: string | null;
    tags?: string[];
    likesCount?: number;
    keyFeatures?: string[];
    theme?: ProductTheme;
    media?: MediaItem[];
    team?: TeamMember[];
    comments?: Comment[];
    announcement?: Announcement;
    countdown?: Countdown;
    socialLinks?: SocialLinks;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface CreateProductLaunchInput {
    name: string;
    tagline?: string;
    description?: string;
    logoUrl?: string;
    websiteUrl?: string;
    launchDate?: Date;
    chatbotId?: string | null;
    tags?: string[];
    keyFeatures?: string[];
    theme?: ProductTheme;
    media?: MediaItem[];
    team?: TeamMember[];
    announcement?: Announcement;
    countdown?: Countdown;
    socialLinks?: SocialLinks;
}

export interface UpdateProductLaunchInput extends Partial<CreateProductLaunchInput> {
    id: string;
}

export interface UpvoteResponse {
    likesCount: number;
}

export interface AddCommentInput {
    content: string;
    author: CommentAuthor;
}

export interface AddReplyInput {
    content: string;
    author: CommentAuthor;
}

export interface CommentUpvoteResponse {
    upvotes: number;
}
