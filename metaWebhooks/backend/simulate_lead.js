const axios = require('axios');

const TARGET_URL = process.argv[2] || 'http://localhost:5000/webhook';

const mockWebhookPayload = {
  object: 'page',
  entry: [
    {
      id: '10029384756',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'leadgen',
          value: {
            ad_id: '2385109283746',
            form_id: '1938472910293',
            leadgen_id: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
            created_time: Math.floor(Date.now() / 1000),
            page_id: '10029384756',
            adgroup_id: '2385109283747'
          }
        }
      ]
    }
  ]
};

console.log(`📡 Simulating Meta Lead Ad Webhook POST to: ${TARGET_URL}`);
console.log('Payload:', JSON.stringify(mockWebhookPayload, null, 2));

axios.post(TARGET_URL, mockWebhookPayload)
  .then(res => {
    console.log(`\nServer Response Status: ${res.status} (${res.data})`);
    console.log('Check your server console and connected mobile app to verify real-time push!');
  })
  .catch(err => {
    console.error(`\nError posting to ${TARGET_URL}:`, err.message);
  });
