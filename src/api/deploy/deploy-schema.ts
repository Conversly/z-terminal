import * as yup from 'yup';

const hexColor = yup
	.string()
	.matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color');

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const domainString = yup
	.string()
	.trim()
	.matches(domainRegex, 'Must be a valid domain (e.g., example.com)');

// please do not remove comments from widget config. mai confuse ho jata hun
const stylesSchema = yup.object().shape({
	appearance: yup.mixed().oneOf(['light', 'dark']).optional(),  // renamed from 'theme'
	displayStyle: yup.mixed().oneOf(['corner', 'overlay']).optional(),  // NEW
	displayName: yup.string().trim().max(100, 'Display name too long').optional(),
	
	// Colors
	primaryColor: hexColor.optional(),  // replaces headerColor, buttonColor
	bubbleBubbleColour: hexColor.optional(),  // NEW: for message bubbles
	
	// Icons & Assets
	PrimaryIcon: yup.string().trim().optional(),  // renamed from profilePictureFile
	widgeticon: yup.string().trim().optional(),  // renamed from chatIcon
	
	// Button Configuration
	alignChatButton: yup.mixed().oneOf(['left', 'right']).optional(),
	showButtonText: yup.boolean().optional(),  // NEW
	buttonText: yup.string().trim().max(100).optional(),  // NEW
	
	// Messages & Placeholders
	messagePlaceholder: yup.string().trim().max(200).optional(),
	footerText: yup.string().trim().max(500).optional(),  // HTML
	dismissableNoticeText: yup.string().trim().max(500).optional(),  // HTML
	
	// Dimensions
	chatWidth: yup.string().trim().optional(),  // NEW
	chatHeight: yup.string().trim().optional(),  // NEW
	
	// Behavior Flags
	autoShowInitial: yup.boolean().optional(),  // NEW
	autoShowDelaySec: yup
		.number()
		.min(0, 'Must be >= 0')
		.max(60, 'Must be <= 60 seconds')
		.optional(),  // renamed from autoOpenChatWindowAfter
	collectUserFeedback: yup.boolean().optional(),
	regenerateMessages: yup.boolean().optional(),
	continueShowingSuggestedMessages: yup.boolean().optional(),
	
	// REMOVED: hiddenPaths
	// REMOVED: userMessageColor (now using primaryColor)
});

export const deployWidgetSchema = yup.object().shape({
	chatbotId: yup
		.string()
		.matches(/^\d+$/, 'Chatbot ID must be a valid number')
		.required('Chatbot ID is required'),

	partial: yup
		.object()
		.shape({
			styles: stylesSchema.optional(),
			onlyAllowOnAddedDomains: yup.boolean().optional().default(false),
			initialMessage: yup.string().trim().max(500).optional(),
			suggestedMessages: yup
				.array()
				.of(yup.string().trim().max(200))
				.optional(),
			allowedDomains: yup.array().of(domainString).optional(),
		})
		.test(
			'domains-required',
			'allowedDomains must be provided when onlyAllowOnAddedDomains is true',
			function (value) {
				if (!value) return true;
				const onlyAllow = (value as any).onlyAllowOnAddedDomains;
				const allowed = (value as any).allowedDomains as unknown[] | undefined;
				if (onlyAllow) return Array.isArray(allowed) && allowed.length > 0;
				return true;
			}
		)
		.required('Partial config is required'),
});

export const fetchWidgetSchema = yup.object().shape({
	chatbotId: yup
		.string()
		.matches(/^\d+$/, 'Chatbot ID must be a valid number')
		.required('Chatbot ID is required'),
});

