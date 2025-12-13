import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../loaders/postgres';
import {
    templates,
    campaigns,
    campaignAudience,
    contacts,
    whatsappAccountStatus
} from '../../drizzle/schema';
import { createId } from '@paralleldrive/cuid2';
import axios from 'axios';
import logger from '../../loaders/logger';
import ApiError from '../../utils/apiError';
import httpStatus from 'http-status';

// --- Templates Service ---

export const handleGetTemplates = async (chatbotId: string) => {
    return await db
        .select()
        .from(templates)
        .where(
            and(
                eq(templates.chatbotId, chatbotId),
                eq(templates.channel, 'WHATSAPP')
            )
        )
        .orderBy(desc(templates.createdAt));
};

export const handleGetDefaultTemplates = async (userId: string, chatbotId: string) => {
    // 1. Get Access Token & WABA ID
    const integration = await db.query.whatsappAccounts.findFirst({
        where: (table: any, { eq }: any) => eq(table.chatbotId, chatbotId),
    });

    if (!integration || !integration.accessToken || !integration.wabaId) {
        throw new ApiError('WhatsApp integration not found or incomplete', httpStatus.BAD_REQUEST);
    }

    // 2. Fetch all templates from Meta (including default ones like hello_world)
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.wabaId}/message_templates`;

    try {
        const response = await axios.get(url, {
            params: {
                limit: 100,
                fields: 'id,name,category,status,language,components,quality_score'
            },
            headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const metaTemplates = response.data.data || [];

        // Filter for default templates (typically APPROVED status and common names)
        const defaultTemplates = metaTemplates.filter((t: any) =>
            t.status === 'APPROVED' &&
            (t.name === 'hello_world' || t.category === 'UTILITY' || t.category === 'AUTHENTICATION')
        );

        return {
            all: metaTemplates,
            defaults: defaultTemplates,
        };
    } catch (error: any) {
        logger.error('Error fetching default templates from Meta:', error.response?.data || error.message);
        throw new ApiError('Failed to fetch templates from Meta', httpStatus.BAD_GATEWAY);
    }
};

// Helper function to extract variables from template components
const extractVariablesFromComponents = (components: any[]): string[] => {
    const variables = new Set<string>();

    for (const component of components || []) {
        // Check BODY text for variables like {{1}}, {{2}}, etc.
        if (component.type === 'BODY' && component.text) {
            const matches = component.text.match(/\{\{(\d+)\}\}/g);
            if (matches) {
                matches.forEach((match: string) => {
                    const varNum = match.match(/\{?\{?(\d+)\}?\}?/)?.[1];
                    if (varNum) {
                        variables.add(varNum);
                    }
                });
            }
        }

        // Check HEADER text for variables
        if (component.type === 'HEADER' && component.text) {
            const matches = component.text.match(/\{\{(\d+)\}\}/g);
            if (matches) {
                matches.forEach((match: string) => {
                    const varNum = match.match(/\{?\{?(\d+)\}?\}?/)?.[1];
                    if (varNum) {
                        variables.add(varNum);
                    }
                });
            }
        }
    }

    // Return sorted array of variable numbers
    return Array.from(variables).sort((a, b) => parseInt(a) - parseInt(b));
};

export const handleSyncTemplates = async (userId: string, chatbotId: string) => {
    // 1. Get Access Token & WABA ID
    const integration = await db.query.whatsappAccounts.findFirst({
        where: (table: any, { eq }: any) => eq(table.chatbotId, chatbotId),
    });

    if (!integration || !integration.accessToken || !integration.wabaId) {
        throw new ApiError('WhatsApp integration not found or incomplete', httpStatus.BAD_REQUEST);
    }

    // 2. Fetch from Meta
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.wabaId}/message_templates`;
    let metaTemplates: any[] = [];

    try {
        const response = await axios.get(url, {
            params: { limit: 100 },
            headers: { Authorization: `Bearer ${integration.accessToken}` }
        });
        metaTemplates = response.data.data || [];
    } catch (error: any) {
        logger.error('Error fetching templates from Meta:', error.response?.data || error.message);
        throw new ApiError('Failed to fetch templates from Meta', httpStatus.BAD_GATEWAY);
    }

    // 3. Upsert into DB - ensure templates are associated with the correct chatbot
    const results = [];
    for (const t of metaTemplates) {
        // Map status
        let status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT' = 'PENDING';
        if (t.status === 'APPROVED') status = 'APPROVED';
        else if (t.status === 'REJECTED') status = 'REJECTED';
        else if (t.status === 'DRAFT') status = 'DRAFT';

        // Extract variables from components
        const variables = extractVariablesFromComponents(t.components || []);

        // Generate content from BODY component for easier searching
        const bodyComponent = (t.components || []).find((c: any) => c.type === 'BODY');
        const content = bodyComponent?.text || '';

        // Check if exists for THIS chatbot (important: templates are per chatbot)
        const existing = await db
            .select()
            .from(templates)
            .where(
                and(
                    eq(templates.metaTemplateId, t.id),
                    eq(templates.channel, 'WHATSAPP'),
                    eq(templates.chatbotId, chatbotId) // Ensure we check for the correct chatbot
                )
            )
            .limit(1)
            .then((r) => r[0]);

        if (existing) {
            // Check if updates are needed
            const hasChanges =
                existing.name !== t.name ||
                existing.language !== t.language ||
                existing.status !== status ||
                existing.category !== t.category ||
                existing.content !== content ||
                JSON.stringify(existing.variables) !== JSON.stringify(variables) ||
                JSON.stringify(existing.components) !== JSON.stringify(t.components);

            if (hasChanges) {
                // Update existing template for this chatbot
                const [updated] = await db.update(templates)
                    .set({
                        name: t.name,
                        language: t.language,
                        status: status,
                        category: t.category,
                        components: t.components,
                        content: content,
                        variables: variables,
                        updatedAt: new Date()
                    })
                    .where(eq(templates.id, existing.id))
                    .returning();
                results.push({ id: updated.id, name: updated.name, status: updated.status });
            } else {
                results.push({ id: existing.id, name: existing.name, status: existing.status });
            }
        } else {
            // Insert new template for this chatbot
            const newId = createId();
            const [inserted] = await db.insert(templates).values({
                id: newId,
                chatbotId,
                channel: 'WHATSAPP',
                metaTemplateId: t.id,
                name: t.name,
                language: t.language,
                status: status,
                category: t.category,
                components: t.components,
                content: content,
                variables: variables,
            }).returning();
            results.push({ id: inserted.id, name: inserted.name, status: inserted.status });
        }
    }

    return {
        count: results.length,
        data: results
    };
};

export const handleCreateTemplate = async (
    userId: string,
    chatbotId: string,
    data: { name: string; category: string; language: string; components: any[]; allowCategoryChange?: boolean }
) => {
    // 1. Get Access Token & WABA ID
    const integration = await db.query.whatsappAccounts.findFirst({
        where: (table: any, { eq }: any) => eq(table.chatbotId, chatbotId),
    });

    if (!integration || !integration.accessToken || !integration.wabaId) {
        throw new ApiError('WhatsApp integration not found or incomplete', httpStatus.BAD_REQUEST);
    }

    // 2. Create template via Meta API
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.wabaId}/message_templates`;

    // Normalize language code (en_US -> en, but keep others as-is)
    let normalizedLanguage = data.language;
    if (normalizedLanguage && normalizedLanguage.includes('_')) {
        // Extract base language code (e.g., "en_US" -> "en")
        normalizedLanguage = normalizedLanguage.split('_')[0];
    }

    // Transform and validate components for Meta API
    const transformedComponents = data.components.map((component: any) => {
        const transformed: any = {
            type: component.type,
        };

        // Handle HEADER component
        if (component.type === 'HEADER') {
            if (component.format) {
                transformed.format = component.format;
            }
            if (component.text) {
                transformed.text = component.text;
            }
            // Add example for HEADER with TEXT format (required by Meta API)
            if (component.format === 'TEXT' && component.text) {
                // Extract variables from text ({{1}}, {{2}}, etc.)
                const variableMatches = component.text.match(/\{\{(\d+)\}\}/g);
                if (variableMatches && variableMatches.length > 0) {
                    // Create example values for variables
                    const exampleValues = variableMatches.map((match: string, index: number) =>
                        `Example${index + 1}`
                    );
                    transformed.example = {
                        header_text: [exampleValues.join(' ')]
                    };
                } else {
                    // No variables, but Meta still requires example for TEXT format
                    transformed.example = {
                        header_text: [component.text]
                    };
                }
            }
        }

        // Handle BODY component
        if (component.type === 'BODY') {
            if (component.text) {
                transformed.text = component.text;
                // Add example for BODY if it has variables
                const variableMatches = component.text.match(/\{\{(\d+)\}\}/g);
                if (variableMatches && variableMatches.length > 0) {
                    // Create example values for variables
                    const exampleValues = variableMatches.map((match: string) => {
                        const varNum = match.match(/\{?\{?(\d+)\}?\}?/)?.[1];
                        return `Example${varNum || ''}`;
                    });
                    transformed.example = {
                        body_text: [[...exampleValues]]
                    };
                }
            }
        }

        // Handle FOOTER component
        if (component.type === 'FOOTER') {
            if (component.text) {
                transformed.text = component.text;
            }
        }

        // Handle BUTTONS component
        if (component.type === 'BUTTONS' && component.buttons) {
            transformed.buttons = component.buttons;
        }

        return transformed;
    });

    const templatePayload: any = {
        name: data.name,
        category: data.category,
        language: normalizedLanguage,
        components: transformedComponents,
    };

    // Add allow_category_change if provided
    if (data.allowCategoryChange !== undefined) {
        templatePayload.allow_category_change = data.allowCategoryChange;
    }

    let metaTemplateId: string;
    try {
        logger.info('Creating template in Meta with payload:', JSON.stringify(templatePayload, null, 2));
        const response = await axios.post(url, templatePayload, {
            headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        metaTemplateId = response.data.id;
        logger.info(`Template created in Meta: ${metaTemplateId}`);
    } catch (error: any) {
        const errorDetails = error.response?.data || error.message;
        logger.error('Error creating template in Meta:', JSON.stringify(errorDetails, null, 2));
        logger.error('Request payload was:', JSON.stringify(templatePayload, null, 2));
        throw new ApiError(
            `Failed to create template in Meta: ${error.response?.data?.error?.message || error.message}`,
            httpStatus.BAD_GATEWAY
        );
    }

    // 3. Store in database
    const templateId = createId();
    await db.insert(templates).values({
        id: templateId,
        chatbotId,
        channel: 'WHATSAPP',
        metaTemplateId: metaTemplateId,
        name: data.name,
        language: data.language,
        status: 'PENDING', // New templates start as PENDING
        category: data.category,
        components: data.components,
        content: '', // Required field, will be populated from components
        variables: [],
    });

    return {
        id: templateId,
        metaTemplateId,
        name: data.name,
        language: data.language,
        status: 'PENDING',
        category: data.category,
    };
};

export const handleCreateDefaultTemplate = async (
    userId: string,
    chatbotId: string,
    data: {
        name: string;
        category: string;
        language: string;
        components: any[];
        allowCategoryChange?: boolean;
        saveAsDraft?: boolean; // If true, save locally without submitting to Meta
    }
) => {
    // If saveAsDraft is true, save locally without submitting to Meta
    if (data.saveAsDraft) {
        const templateId = createId();
        await db.insert(templates).values({
            id: templateId,
            chatbotId,
            channel: 'WHATSAPP',
            metaTemplateId: null, // No Meta template ID for drafts
            name: data.name,
            language: data.language,
            status: 'DRAFT', // Custom status for drafts
            category: data.category,
            components: data.components,
            content: '', // Required field, will be populated from components
            variables: [],
        });

        return {
            id: templateId,
            metaTemplateId: null,
            name: data.name,
            language: data.language,
            status: 'DRAFT',
            category: data.category,
            isDraft: true,
        };
    }

    // Otherwise, create via Meta API (same as handleCreateTemplate)
    return await handleCreateTemplate(userId, chatbotId, data);
};

export const handleUpdateTemplate = async (
    userId: string,
    chatbotId: string,
    templateId: string,
    data: {
        name?: string;
        category?: string;
        language?: string;
        components?: any[];
        allowCategoryChange?: boolean;
    }
) => {
    // 1. Get template from database
    const template = await db
        .select()
        .from(templates)
        .where(
            and(
                eq(templates.id, templateId),
                eq(templates.chatbotId, chatbotId),
                eq(templates.channel, 'WHATSAPP')
            )
        )
        .limit(1)
        .then((r) => r[0]);

    if (!template) {
        throw new ApiError('Template not found', httpStatus.NOT_FOUND);
    }

    // 2. If it's a draft (no metaTemplateId), just update locally
    if (!template.metaTemplateId) {
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (data.name) updateData.name = data.name;
        if (data.category) updateData.category = data.category;
        if (data.language) updateData.language = data.language;
        if (data.components) updateData.components = data.components;

        const [updated] = await db
            .update(templates)
            .set(updateData)
            .where(eq(templates.id, templateId))
            .returning();

        return {
            id: updated.id,
            metaTemplateId: updated.metaTemplateId,
            name: updated.name,
            language: updated.language,
            status: updated.status,
            category: updated.category,
            isDraft: true,
        };
    }

    // 3. If it's already submitted to Meta, we need to create a new version
    // Meta doesn't allow direct updates - you create a new version with the same name
    const integration = await db.query.whatsappAccounts.findFirst({
        where: (table: any, { eq }: any) => eq(table.chatbotId, chatbotId),
    });

    if (!integration || !integration.accessToken || !integration.wabaId) {
        throw new ApiError('WhatsApp integration not found or incomplete', httpStatus.BAD_REQUEST);
    }

    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.wabaId}/message_templates`;

    const templatePayload: any = {
        name: data.name || template.name,
        category: data.category || template.category,
        language: data.language || template.language,
        components: data.components || template.components,
    };

    if (data.allowCategoryChange !== undefined) {
        templatePayload.allow_category_change = data.allowCategoryChange;
    }

    let newMetaTemplateId: string;
    try {
        const response = await axios.post(url, templatePayload, {
            headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        newMetaTemplateId = response.data.id;
        logger.info(`Template updated (new version) in Meta: ${newMetaTemplateId}`);
    } catch (error: any) {
        logger.error('Error updating template in Meta:', error.response?.data || error.message);
        throw new ApiError(
            `Failed to update template in Meta: ${error.response?.data?.error?.message || error.message}`,
            httpStatus.BAD_GATEWAY
        );
    }

    // 4. Update database with new Meta template ID
    const updateData: any = {
        metaTemplateId: newMetaTemplateId,
        updatedAt: new Date(),
    };

    if (data.name) updateData.name = data.name;
    if (data.category) updateData.category = data.category;
    if (data.language) updateData.language = data.language;
    if (data.components) updateData.components = data.components;
    if (template.status === 'PENDING') {
        updateData.status = 'PENDING'; // Keep as PENDING since it's a new version
    }

    const [updated] = await db
        .update(templates)
        .set(updateData)
        .where(eq(templates.id, templateId))
        .returning();

    return {
        id: updated.id,
        metaTemplateId: updated.metaTemplateId,
        name: updated.name,
        language: updated.language,
        status: updated.status,
        category: updated.category,
    };
};

export const handleDeleteTemplate = async (
    userId: string,
    chatbotId: string,
    templateId: string
) => {
    // 1. Get template from database
    const template = await db
        .select()
        .from(templates)
        .where(
            and(
                eq(templates.id, templateId),
                eq(templates.chatbotId, chatbotId),
                eq(templates.channel, 'WHATSAPP')
            )
        )
        .limit(1)
        .then((r) => r[0]);

    if (!template) {
        throw new ApiError('Template not found', httpStatus.NOT_FOUND);
    }

    // 2. Get Access Token & WABA ID
    const integration = await db.query.whatsappAccounts.findFirst({
        where: (table: any, { eq }: any) => eq(table.chatbotId, chatbotId),
    });

    if (!integration || !integration.accessToken || !integration.wabaId) {
        throw new ApiError('WhatsApp integration not found or incomplete', httpStatus.BAD_REQUEST);
    }

    // 3. Delete from Meta API
    // Meta API requires name and language parameters for template deletion
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.wabaId}/message_templates`;

    try {
        await axios.delete(url, {
            params: {
                name: template.name,
                language: template.language,
            },
            headers: {
                Authorization: `Bearer ${integration.accessToken}`,
            },
        });
        logger.info(`Template deleted from Meta: ${template.name} (${template.language})`);
    } catch (error: any) {
        // Meta API might return error if template doesn't exist or can't be deleted
        // Log but continue to delete from database
        const errorMsg = error.response?.data?.error?.message || error.message;
        logger.warn(`Error deleting template from Meta (continuing with DB deletion): ${errorMsg}`);

        // If it's a critical error (not just "not found"), we might want to throw
        // For now, we'll continue with DB deletion regardless
    }

    // 4. Delete from database
    await db.delete(templates)
        .where(eq(templates.id, templateId));

    return { success: true, message: 'Template deleted successfully' };
};


// --- Campaigns Service ---

export const handleGetCampaigns = async (chatbotId: string) => {
    return await db
        .select()
        .from(campaigns)
        .where(
            and(
                eq(campaigns.chatbotId, chatbotId),
                eq(campaigns.channel, 'WHATSAPP')
            )
        )
        .orderBy(desc(campaigns.createdAt));
};

export const handleCreateCampaign = async (
    userId: string,
    chatbotId: string,
    data: { name: string; templateId: string; scheduledAt?: Date; audienceFile?: any }
) => {
    // Basic creation
    const campaignId = createId();
    await db.insert(campaigns).values({
        id: campaignId,
        chatbotId,
        channel: 'WHATSAPP',
        name: data.name,
        templateId: data.templateId,
        scheduledAt: data.scheduledAt,
        status: 'DRAFT',
    });

    return { id: campaignId, ...data };
};

export const handleLaunchCampaign = async (
    userId: string,
    campaignId: string,
    chatbotId: string,
    contactIds?: string[]
) => {
    // 1. Get Campaign and Check Status
    const campaign = await db
        .select()
        .from(campaigns)
        .where(
            and(
                eq(campaigns.id, campaignId),
                eq(campaigns.chatbotId, chatbotId),
                eq(campaigns.channel, 'WHATSAPP')
            )
        )
        .limit(1)
        .then((r) => r[0]);

    if (!campaign) throw new ApiError('Campaign not found', httpStatus.NOT_FOUND);
    if (campaign.status !== 'DRAFT') throw new ApiError('Campaign is not in DRAFT status', httpStatus.BAD_REQUEST);

    // 2. Get Integration (for Token)
    const integration = await db.query.whatsappAccounts.findFirst({
        where: (table: any, { eq }: any) => eq(table.chatbotId, chatbotId),
    });
    if (!integration || !integration.accessToken || !integration.phoneNumberId) {
        throw new ApiError('WhatsApp integration not ready', httpStatus.BAD_REQUEST);
    }

    // 3. Get Template (for Name/Lang)
    const template = await db
        .select()
        .from(templates)
        .where(eq(templates.id, campaign.templateId))
        .limit(1)
        .then((r) => r[0]);
    if (!template) throw new ApiError('Template not found', httpStatus.BAD_REQUEST);

    // 4. Determine Audience
    let audienceContacts: any[] = [];
    if (contactIds && contactIds.length > 0) {
        // Fetch specific contacts
        const allContacts = await db
            .select()
            .from(contacts)
            .where(
                and(
                    eq(contacts.chatbotId, chatbotId),
                    sql`'WHATSAPP' = ANY(${contacts.channels})`
                )
            );
        audienceContacts = allContacts.filter((c: any) => contactIds.includes(c.id));
    } else {
        // Fetch All
        audienceContacts = await db
            .select()
            .from(contacts)
            .where(
                and(
                    eq(contacts.chatbotId, chatbotId),
                    sql`'WHATSAPP' = ANY(${contacts.channels})`
                )
            );
    }

    if (audienceContacts.length === 0) {
        throw new ApiError('No audience selected for campaign', httpStatus.BAD_REQUEST);
    }

    // 5. Update Campaign Status
    await db.update(campaigns)
        .set({
            status: 'PROCESSING',
            sentCount: 0
        })
        .where(eq(campaigns.id, campaignId));


    // 6. Send Messages (Simple Loop for MVP)
    // In production, this should be a background job.
    let sentCount = 0;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.phoneNumberId}/messages`;

    for (const contact of audienceContacts) {
        const audienceId = createId();

        // Insert Audience Record (PENDING)
        await db.insert(campaignAudience).values({
            id: audienceId,
            campaignId: campaignId,
            contactId: contact.id,
            status: 'PENDING'
        });

        try {
            // Construct generic payload based on template definition
            const templatePayload: any = {
                name: template.name,
                language: {
                    code: template.language
                },
                components: []
            };

            const templateComponents = template.components || [];

            // 1. Handle Header
            const headerDef = templateComponents.find((c: any) => c.type === 'HEADER');
            if (headerDef) {
                if (headerDef.format === 'IMAGE') {
                    // Default generic image if no specific one provided (using one of the user's valid CDN links for demo stability)
                    const demoImage = "https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1530053877871776";
                    templatePayload.components.push({
                        type: 'header',
                        parameters: [{
                            type: 'image',
                            image: { link: demoImage }
                        }]
                    });
                } else if (headerDef.format === 'TEXT' && headerDef.text) {
                    const paramCount = (headerDef.text.match(/\{\{(\d+)\}\}/g) || []).length;
                    if (paramCount > 0) {
                        // Header has variables
                        const params = [];
                        for (let i = 0; i < paramCount; i++) {
                            params.push({ type: 'text', text: "HeaderVal" });
                        }
                        templatePayload.components.push({
                            type: 'header',
                            parameters: params
                        });
                    }
                }
            }

            // 2. Handle Body
            const bodyDef = templateComponents.find((c: any) => c.type === 'BODY');
            if (bodyDef && bodyDef.text) {
                const paramCount = (bodyDef.text.match(/\{\{(\d+)\}\}/g) || []).length;
                if (paramCount > 0) {
                    const params = [];
                    for (let i = 0; i < paramCount; i++) {
                        // First variable often Name
                        if (i === 0) params.push({ type: 'text', text: contact.displayName || 'Customer' });
                        else params.push({ type: 'text', text: `Val${i + 1}` }); // Placeholder
                    }
                    templatePayload.components.push({
                        type: 'body',
                        parameters: params
                    });
                }
            }

            // 3. Handle Carousel
            const carouselDef = templateComponents.find((c: any) => c.type === 'CAROUSEL');
            if (carouselDef && carouselDef.cards) {
                const cards = carouselDef.cards.map((card: any, index: number) => {
                    // Map card components to parameters
                    // Usually Cards have Header (Image/Video) and Body
                    const cardComponents = [];

                    const cardHeader = card.components?.find((c: any) => c.type === 'HEADER');
                    if (cardHeader && cardHeader.format === 'IMAGE') {
                        // Alternate images for visual distinction
                        const imgLink = index % 2 === 0
                            ? "https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1389202275965231"
                            : "https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=3255815791260974";

                        cardComponents.push({
                            type: 'header',
                            parameters: [{
                                type: 'image',
                                image: { link: imgLink }
                            }]
                        });
                    }
                    // Add other card component mappings if necessary (e.g. body vars)

                    return {
                        card_index: index,
                        components: cardComponents
                    };
                });

                templatePayload.components.push({
                    type: 'carousel',
                    cards: cards
                });
            }

            const payload = {
                messaging_product: "whatsapp",
                to: contact.phoneNumber,
                type: "template",
                template: templatePayload
            };

            const response = await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${integration.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const messageId = response.data?.messages?.[0]?.id;

            logger.info(`Message sent successfully to ${contact.phoneNumber}`, {
                campaignId,
                contactId: contact.id,
                messageId,
                metaResponse: response.data
            });

            // Update Audience Status (SENT)
            await db.update(campaignAudience)
                .set({
                    status: 'SENT',
                    sentAt: new Date(),
                    messageId: messageId
                })
                .where(eq(campaignAudience.id, audienceId));

            sentCount++;
        } catch (error: any) {
            const errorDetails = error.response?.data || error.message;
            logger.error(`Failed to send to ${contact.phoneNumber}`, {
                campaignId,
                contactId: contact.id,
                error: errorDetails
            });

            // Update Audience Status (FAILED)
            await db.update(campaignAudience)
                .set({
                    status: 'FAILED',
                    errorMessage: JSON.stringify(errorDetails)
                })
                .where(eq(campaignAudience.id, audienceId));
        }
    }

    // 7. Update Campaign Status to COMPLETED
    await db.update(campaigns)
        .set({
            status: 'COMPLETED',
            sentCount: sentCount
        })
        .where(eq(campaigns.id, campaignId));

    return { success: true, message: `Campaign launched. Sent ${sentCount}/${audienceContacts.length} messages.` };
};

// --- Contacts Service ---

export const handleGetContacts = async (chatbotId: string) => {
    return await db
        .select()
        .from(contacts)
        .where(
            and(
                eq(contacts.chatbotId, chatbotId),
                sql`'WHATSAPP' = ANY(${contacts.channels})`
            )
        )
        .orderBy(desc(contacts.updatedAt));
};

// --- Additional Stats ---

export const handleGetCampaignStats = async (campaignId: string) => {
    // Basic stats from campaign table
    const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1)
        .then((r) => r[0]);

    // In future: Aggregate from audience table if we track individual status there
    return campaign;
};
