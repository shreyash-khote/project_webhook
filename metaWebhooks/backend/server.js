const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;


const receivedLeads = [];


io.on('connection', (socket) => {
  console.log(`[SOCKET_CONNECTED] Client connected: ${socket.id}`);
  

  socket.emit('initial_leads', receivedLeads);

  socket.on('disconnect', () => {
    console.log(`[SOCKET_DISCONNECTED] Client disconnected: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Meta Lead Ads Real-Time Webhook Engine',
    connectedClients: io.engine.clientsCount,
    totalLeadsReceived: receivedLeads.length,
    webhookEndpoint: '/webhook',
    configuredToken: process.env.VERIFY_TOKEN ? 'VERIFY_TOKEN is set' : 'VERIFY_TOKEN is NOT set (update .env)'
  });
});


app.get('/api/leads', (req, res) => {
  res.json({
    success: true,
    count: receivedLeads.length,
    leads: receivedLeads
  });
});


app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const configuredToken = process.env.VERIFY_TOKEN || '';

  console.log('META WEBHOOK VERIFICATION REQUEST');
  console.log(`[GET /webhook] mode: "${mode}", verify_token: "${token}"`);

  if (mode && token) {
    if (mode === 'subscribe' && token === configuredToken) {
      console.log('[VERIFICATION_SUCCESS] Token match! Responding with challenge code.');
      return res.status(200).send(challenge);
    } else {
      console.error('[VERIFICATION_FAILED] Token mismatch.');
      console.error(`Expected: "${configuredToken}", Received: "${token}"`);
      return res.status(403).send('Verification token mismatch');
    }
  }

  return res.status(400).send('Missing hub.mode or hub.verify_token query parameters');
});


app.post('/webhook', async (req, res) => {
  const body = req.body;


  console.log('[META_WEBHOOK_EVENT] Incoming POST Payload:');
  console.log(JSON.stringify(body, null, 2));


  res.status(200).send('EVENT_RECEIVED');

  try {
    if (body.object === 'page') {
      for (const entry of (body.entry || [])) {
        for (const change of (entry.changes || [])) {
          if (change.field === 'leadgen') {
            const leadValue = change.value || {};
            const leadgenId = leadValue.leadgen_id;
            const pageId = leadValue.page_id || 'N/A';
            const formId = leadValue.form_id || 'N/A';
            const createdTime = leadValue.created_time || Math.floor(Date.now() / 1000);

            console.log(`[PROCESSING_LEAD] Lead ID: ${leadgenId} | Page: ${pageId} | Form: ${formId}`);

            const leadDetails = await fetchLeadFromMetaGraph(leadgenId);

            if (!leadDetails) {
              console.warn(`[LEAD_SKIPPED] Could not retrieve real lead details for Lead ID: ${leadgenId}`);
              continue;
            }

            const formattedLead = {
              id: leadgenId || `lead_${Date.now()}`,
              pageId: pageId,
              formId: formId,
              createdTime: new Date(createdTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              receivedAt: new Date().toLocaleTimeString(),
              timestamp: Date.now(),
              fullName: leadDetails.fullName,
              email: leadDetails.email,
              phoneNumber: leadDetails.phoneNumber,
              customFields: leadDetails.customFields,
              source: 'Meta Lead Ads Live'
            };

            receivedLeads.unshift(formattedLead);
            if (receivedLeads.length > 50) receivedLeads.pop();

            io.emit('new_lead', formattedLead);
            console.log(`[SOCKET_BROADCAST] Pushed live lead "${formattedLead.fullName}" to ${io.engine.clientsCount} connected app(s).`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[PROCESSING_ERROR] Error handling webhook payload:', err.message);
  }
});

async function fetchLeadFromMetaGraph(leadgenId) {
  const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;

  if (!pageAccessToken) {
    console.error('[GRAPH_API_ERROR] PAGE_ACCESS_TOKEN is missing in .env. Cannot fetch real lead data from Meta.');
    return null;
  }

  try {
    const url = `https://graph.facebook.com/v24.0/${leadgenId}?access_token=${pageAccessToken}`;
    console.log(`[GRAPH_API] Fetching real lead details from: https://graph.facebook.com/v24.0/${leadgenId}`);
    
    const response = await axios.get(url);
    const data = response.data;

    let fullName = 'N/A';
    let email = 'N/A';
    let phoneNumber = 'N/A';
    const customFields = [];

    if (data && data.field_data && Array.isArray(data.field_data)) {
      data.field_data.forEach(field => {
        if (!field) return;
        const rawName = field.name != null ? String(field.name) : '';
        const name = rawName.toLowerCase();
        const val = field.values && Array.isArray(field.values) && field.values.length > 0 ? String(field.values[0] || '') : '';

        if (name.includes('full_name') || name.includes('name')) {
          fullName = val;
        } else if (name.includes('email')) {
          email = val;
        } else if (name.includes('phone')) {
          phoneNumber = val;
        } else {
          customFields.push({ label: rawName || 'Field', value: val });
        }
      });
    }

    console.log('[GRAPH_API_SUCCESS] Fetched real lead data:', { fullName, email, phoneNumber });
    return {
      fullName,
      email,
      phoneNumber,
      customFields
    };

  } catch (error) {
    console.error(`[GRAPH_API_ERROR] Failed to fetch Graph API lead details (${error.response ? error.response.status : error.message}).`);
    return null;
  }
}

// Start Server
server.listen(PORT, () => {
  console.log(`META LEAD WEBHOOK SERVER RUNNING ON PORT ${PORT}`);
});
