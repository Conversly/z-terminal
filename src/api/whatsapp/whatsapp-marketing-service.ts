import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../loaders/postgres';
import {
    whatsappTemplates,
    whatsappCampaigns,
    whatsappCampaignAudience,
    whatsappContacts,
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
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.chatbotId, chatbotId))
        .orderBy(desc(whatsappTemplates.createdAt));
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
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
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

    // 3. Upsert into DB
    const results = [];
    for (const t of metaTemplates) {
        // Map status
        let status: 'APPROVED' | 'PENDING' | 'REJECTED' = 'PENDING';
        if (t.status === 'APPROVED') status = 'APPROVED';
        else if (t.status === 'REJECTED') status = 'REJECTED';

        // Check if exists
        const existing = await db.query.whatsappTemplates.findFirst({
            where: (tbl: any, { eq }: any) => eq(tbl.metaTemplateId, t.id),
        });

        if (existing) {
            // Update
            await db.update(whatsappTemplates)
                .set({
                    name: t.name,
                    language: t.language,
                    status: status,
                    category: t.category,
                    components: t.components,
                    updatedAt: new Date()
                })
                .where(eq(whatsappTemplates.id, existing.id));
            results.push({ ...existing, status });
        } else {
            // Insert
            const newId = createId();
            await db.insert(whatsappTemplates).values({
                id: newId,
                chatbotId,
                metaTemplateId: t.id,
                name: t.name,
                language: t.language,
                status: status,
                category: t.category,
                components: t.components,
            });
            results.push({ id: newId, name: t.name, status });
        }
    }

    return results;
};

export const handleCreateTemplate = async (
    userId: string,
    chatbotId: string,
    data: { name: string; category: string; language: string; components: any[] }
) => {
    // 1. Get Access Token & WABA ID
    const integration = await db.query.whatsappAccounts.findFirst({
        where: (table: any, { eq }: any) => eq(table.chatbotId, chatbotId),
    });

    if (!integration || !integration.accessToken || !integration.wabaId) {
        throw new ApiError('WhatsApp integration not found or incomplete', httpStatus.BAD_REQUEST);
    }

    // 2. Create template via Meta API
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.wabaId}/message_templates`;
    
    const templatePayload = {
        name: data.name,
        category: data.category,
        language: data.language,
        components: data.components,
    };

    let metaTemplateId: string;
    try {
        const response = await axios.post(url, templatePayload, {
            headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        metaTemplateId = response.data.id;
        logger.info(`Template created in Meta: ${metaTemplateId}`);
    } catch (error: any) {
        logger.error('Error creating template in Meta:', error.response?.data || error.message);
        throw new ApiError(
            `Failed to create template in Meta: ${error.response?.data?.error?.message || error.message}`,
            httpStatus.BAD_GATEWAY
        );
    }

    // 3. Store in database
    const templateId = createId();
    await db.insert(whatsappTemplates).values({
        id: templateId,
        chatbotId,
        metaTemplateId: metaTemplateId,
        name: data.name,
        language: data.language,
        status: 'PENDING', // New templates start as PENDING
        category: data.category,
        components: data.components,
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

export const handleDeleteTemplate = async (
    userId: string,
    chatbotId: string,
    templateId: string
) => {
    // 1. Get template from database
    const template = await db.query.whatsappTemplates.findFirst({
        where: (tbl: any, { eq, and }: any) => and(
            eq(tbl.id, templateId),
            eq(tbl.chatbotId, chatbotId)
        ),
    });

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
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
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
    await db.delete(whatsappTemplates)
        .where(eq(whatsappTemplates.id, templateId));

    return { success: true, message: 'Template deleted successfully' };
};


// --- Campaigns Service ---

export const handleGetCampaigns = async (chatbotId: string) => {
    return await db.query.whatsappCampaigns.findMany({
        where: (tbl: any, { eq }: any) => eq(tbl.chatbotId, chatbotId),
        with: {
            // template: true, // If relation was defined in schema relations, but standard drizzle define relations used in query builder often requires explicit schema relations export
        },
        orderBy: (tbl: any, { desc }: any) => [desc(tbl.createdAt)] // Correct syntax for orderBy in query builder
    });
};

export const handleCreateCampaign = async (
    userId: string,
    chatbotId: string,
    data: { name: string; templateId: string; scheduledAt?: Date; audienceFile?: any }
) => {
    // Basic creation
    const campaignId = createId();
    await db.insert(whatsappCampaigns).values({
        id: campaignId,
        chatbotId,
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
    const campaign = await db.query.whatsappCampaigns.findFirst({
        where: (tbl: any, { eq, and }: any) => and(eq(tbl.id, campaignId), eq(tbl.chatbotId, chatbotId))
    });

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
    const template = await db.query.whatsappTemplates.findFirst({
        where: (t: any, { eq }: any) => eq(t.id, campaign.templateId)
    });
    if (!template) throw new ApiError('Template not found', httpStatus.BAD_REQUEST);

    // 4. Determine Audience
    let audienceContacts: any[] = [];
    if (contactIds && contactIds.length > 0) {
        // Fetch specific contacts
        const allContacts = await db.query.whatsappContacts.findMany({
            where: (t: any, { eq }: any) => eq(t.chatbotId, chatbotId)
        });
        audienceContacts = allContacts.filter((c: any) => contactIds.includes(c.id));
    } else {
        // Fetch All
        audienceContacts = await db.query.whatsappContacts.findMany({
            where: (t: any, { eq }: any) => eq(t.chatbotId, chatbotId)
        });
    }

    if (audienceContacts.length === 0) {
        throw new ApiError('No audience selected for campaign', httpStatus.BAD_REQUEST);
    }

    // 5. Update Campaign Status
    await db.update(whatsappCampaigns)
        .set({
            status: 'PROCESSING',
            audienceSize: audienceContacts.length,
            sentCount: 0
        })
        .where(eq(whatsappCampaigns.id, campaignId));


    // 6. Send Messages (Simple Loop for MVP)
    // In production, this should be a background job.
    let sentCount = 0;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.phoneNumberId}/messages`;

    for (const contact of audienceContacts) {
        const audienceId = createId();

        // Insert Audience Record (PENDING)
        await db.insert(whatsappCampaignAudience).values({
            id: audienceId,
            campaignId: campaignId,
            contactId: contact.id,
            status: 'PENDING'
        });

        try {
            // Send via Meta API
            const payload = {
                messaging_product: "whatsapp",
                to: contact.phoneNumber,
                type: "template",
                template: {
                    name: template.name,
                    language: {
                        code: template.language
                    },
                    components: template.components || [] // Use template components if available
                }
            };

            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${integration.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Update Audience Status (SENT)
            await db.update(whatsappCampaignAudience)
                .set({ status: 'SENT' })
                .where(eq(whatsappCampaignAudience.id, audienceId));

            sentCount++;
        } catch (error: any) {
            console.error(`Failed to send to ${contact.phoneNumber}`, error.response?.data || error.message);
            // Update Audience Status (FAILED)
            await db.update(whatsappCampaignAudience)
                .set({ status: 'FAILED' })
                .where(eq(whatsappCampaignAudience.id, audienceId));
        }
    }

    // 7. Update Campaign Status to COMPLETED
    await db.update(whatsappCampaigns)
        .set({
            status: 'COMPLETED',
            sentCount: sentCount
        })
        .where(eq(whatsappCampaigns.id, campaignId));

    return { success: true, message: `Campaign launched. Sent ${sentCount}/${audienceContacts.length} messages.` };
};

// --- Contacts Service ---

export const handleGetContacts = async (chatbotId: string) => {
    return await db.query.whatsappContacts.findMany({
        where: (tbl: any, { eq }: any) => eq(tbl.chatbotId, chatbotId),
        orderBy: (tbl: any, { desc }: any) => [desc(tbl.updatedAt)]
    });
};

// --- Additional Stats ---

export const handleGetCampaignStats = async (campaignId: string) => {
    // Basic stats from campaign table
    const campaign = await db.query.whatsappCampaigns.findFirst({
        where: (tbl: any, { eq }: any) => eq(tbl.id, campaignId)
    });

    // In future: Aggregate from audience table if we track individual status there
    return campaign;
};
