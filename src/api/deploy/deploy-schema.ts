import * as yup from 'yup';

const hexColor = yup
	.string()
	.matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color');

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const domainString = yup
	.string()
	.trim()
	.matches(domainRegex, 'Must be a valid domain (e.g., example.com)');

const stylesSchema = yup.object().shape({
	theme: yup.mixed().oneOf(['light', 'dark']).optional(),
	headerColor: hexColor.optional(),
	userMessageColor: hexColor.optional(),
	buttonColor: hexColor.optional(),
	displayName: yup.string().trim().max(100, 'Display name too long').optional(),
	// Accept a URL string or null for profile picture; backend can resolve uploads separately
	profilePictureFile: yup.mixed().nullable().optional(),
	chatIcon: yup.string().trim().optional(),
	autoOpenChatWindowAfter: yup
		.number()
		.min(0, 'Must be >= 0')
		.max(60, 'Must be <= 60 seconds')
		.optional(),
	alignChatButton: yup.mixed().oneOf(['left', 'right']).optional(),
	messagePlaceholder: yup.string().trim().max(200).optional(),
	footerText: yup.string().trim().max(200).optional(),
	collectUserFeedback: yup.boolean().optional(),
	regenerateMessages: yup.boolean().optional(),
	continueShowingSuggestedMessages: yup.boolean().optional(),
	dismissableNoticeText: yup.string().trim().max(500).optional(),
	hiddenPaths: yup.array().of(yup.string().trim().required()).optional(),
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

