import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
    getTemplates,
    syncTemplates,
    createTemplate,
    createDefaultTemplate,
    updateTemplate,
    getDefaultTemplates,
    deleteTemplate,
    getCampaigns,
    createCampaign,
    launchCampaign,
    getContacts,
    getCampaignStats
} from './whatsapp-marketing-controller';
import {
    createCampaignSchema,
    syncTemplatesSchema,
    launchCampaignSchema,
    createTemplateSchema
} from './whatsapp-schema';

const app = express.Router();

// Templates
app.get('/templates', auth, getTemplates);
app.get('/templates/defaults', auth, getDefaultTemplates); // Get default templates from Meta
app.post('/templates/sync', auth, validate('body', syncTemplatesSchema), syncTemplates);
app.post('/templates', auth, validate('body', createTemplateSchema), createTemplate);
app.post('/templates/default', auth, validate('body', createTemplateSchema), createDefaultTemplate); // Create default template with save/edit options
app.patch('/templates/:id', auth, updateTemplate); // Update template (edit)
app.delete('/templates/:id', auth, deleteTemplate);

// Campaigns
app.get('/campaigns', auth, getCampaigns);
app.post('/campaigns', auth, validate('body', createCampaignSchema), createCampaign);
app.post('/campaigns/:id/launch', auth, validate('body', launchCampaignSchema), launchCampaign);
app.get('/campaigns/:id/stats', auth, getCampaignStats);

// Contacts (Marketing specific list)
app.get('/contacts-list', auth, getContacts);

export default app;
