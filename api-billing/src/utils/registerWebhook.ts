/**
 * Script to register webhook with PayMongo
 * Run this once to set up the webhook endpoint
 * 
 * Usage: ts-node src/utils/registerWebhook.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';
const WEBHOOK_URL = process.env.PAYMONGO_WEBHOOK_URL || 'https://your-domain.com/webhooks/paymongo';

async function registerWebhook() {
  if (!PAYMONGO_SECRET_KEY) {
    console.error('❌ PAYMONGO_SECRET_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('🔄 Registering webhook with PayMongo...');
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);

  try {
    const response = await axios.post(
      'https://api.paymongo.com/v1/webhooks',
      {
        data: {
          attributes: {
            url: WEBHOOK_URL,
            events: [
              'link.payment.paid'
            ]
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const webhookData = response.data.data;

    console.log('\n✅ Webhook registered successfully!');
    console.log('📋 Webhook Details:');
    console.log(`   ID: ${webhookData.id}`);
    console.log(`   URL: ${webhookData.attributes.url}`);
    console.log(`   Events: ${webhookData.attributes.events.join(', ')}`);
    console.log(`   Status: ${webhookData.attributes.status}`);
    console.log(`   Secret Key: ${webhookData.attributes.secret_key}`);
    console.log('\n⚠️  IMPORTANT: Save the Secret Key above to your .env file as PAYMONGO_WEBHOOK_SECRET');

  } catch (error: any) {
    console.error('\n❌ Failed to register webhook');
    if (error.response) {
      console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// List existing webhooks
async function listWebhooks() {
  console.log('\n🔍 Listing existing webhooks...');

  try {
    const response = await axios.get(
      'https://api.paymongo.com/v1/webhooks',
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const webhooks = response.data.data;

    if (webhooks.length === 0) {
      console.log('No webhooks found.');
    } else {
      console.log(`Found ${webhooks.length} webhook(s):`);
      webhooks.forEach((webhook: any, index: number) => {
        console.log(`\n${index + 1}. Webhook ID: ${webhook.id}`);
        console.log(`   URL: ${webhook.attributes.url}`);
        console.log(`   Events: ${webhook.attributes.events.join(', ')}`);
        console.log(`   Status: ${webhook.attributes.status}`);
      });
    }
  } catch (error: any) {
    console.error('Failed to list webhooks:', error.response?.data || error.message);
  }
}

// Main execution
const command = process.argv[2];

if (command === 'list') {
  listWebhooks();
} else if (command === 'register' || !command) {
  registerWebhook();
} else {
  console.log('Usage:');
  console.log('  ts-node src/utils/registerWebhook.ts           - Register new webhook');
  console.log('  ts-node src/utils/registerWebhook.ts register  - Register new webhook');
  console.log('  ts-node src/utils/registerWebhook.ts list      - List existing webhooks');
}
