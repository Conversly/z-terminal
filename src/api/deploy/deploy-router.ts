import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { 
	getWidget, 
	getWidgetExternal,
	upsertWidget,
	generateApiKey,
	getApiKey,
	getAllowedDomains,
	addAllowedDomain
} from './deploy-controller';
import { deployWidgetSchema, fetchWidgetSchema, addAllowedDomainSchema } from './deploy-schema';

const app = express.Router();

app.get('/widget/config', auth, validate('query', fetchWidgetSchema), getWidget);
app.post('/widget',auth, validate('body', deployWidgetSchema), upsertWidget);

// API Key routes
app.post('/key', auth, validate('query', fetchWidgetSchema), generateApiKey);
app.get('/key', auth, validate('query', fetchWidgetSchema), getApiKey);


// Domain routes
app.get('/widget/domains', auth, validate('query', fetchWidgetSchema), getAllowedDomains);
app.post('/widget/domains', auth, validate('body', addAllowedDomainSchema), addAllowedDomain);



app.get(
  '/widget/external',
  (req, res, next) => {
    res.removeHeader('Access-Control-Allow-Origin');
    res.removeHeader('Access-Control-Allow-Methods');
    res.removeHeader('Access-Control-Allow-Headers');
    res.removeHeader('Access-Control-Allow-Credentials');

    const origin = req.headers.origin as string | undefined;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HMAC-Signature'
    );
    next();
  },
  validate('query', fetchWidgetSchema),
  getWidgetExternal
);

export default app;