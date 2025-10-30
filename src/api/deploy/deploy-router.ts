import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { 
	getWidget, 
	upsertWidget,
	generateApiKey,
	getApiKey,
	getAllowedDomains,
	addAllowedDomain
} from './deploy-controller';
import { deployWidgetSchema, fetchWidgetSchema, addAllowedDomainSchema } from './deploy-schema';

const app = express.Router();

// Widget routes
app.get('/widget/:chatbotId', auth, validate('params', fetchWidgetSchema), getWidget);
app.post('/widget', auth, validate('body', deployWidgetSchema), upsertWidget);

// API Key routes
app.post('/key/:chatbotId', auth, validate('params', fetchWidgetSchema), generateApiKey);
app.get('/key/:chatbotId', auth, validate('params', fetchWidgetSchema), getApiKey);

// Domain routes
app.get('/widget/domains/:chatbotId', auth, validate('params', fetchWidgetSchema), getAllowedDomains);
app.post('/widget/domains', auth, validate('body', addAllowedDomainSchema), addAllowedDomain);

export default app;