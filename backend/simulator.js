/**
 * IVR Simulator
 * Simulates a telephony provider (like Twilio) interacting with the backend.
 * Run: node simulator.js
 */
const readline = require('readline');

// Config
const API_URL = 'http://localhost:5000/api/ivr/incoming';
const DEFAULT_SHOP_IVR = '+919876543210';
const DEFAULT_CALLER = '+919000000001'; // Linked to seeded card 330000000001

// generated CallSid
const callSid = 'SIM_' + Date.now();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question, defaultVal) {
    return new Promise((resolve) => {
        rl.question(`${question} [${defaultVal}]: `, (answer) => {
            resolve(answer.trim() || defaultVal);
        });
    });
}

// Simple TwiML Parser (Regex-based)
function parseTwiML(xml) {
    const says = [];
    const gathers = [];
    const hangups = [];
    let action = null;

    // Extract <Say> content
    const sayRegex = /<Say[^>]*>(.*?)<\/Say>/g;
    let match;
    while ((match = sayRegex.exec(xml)) !== null) {
        says.push(match[1]);
    }

    // Check for <Gather>
    const gatherMatch = /<Gather[^>]*action="([^"]+)"[^>]*>/.exec(xml);
    if (xml.includes('<Gather')) {
        gathers.push(true);
        if (gatherMatch) {
            action = gatherMatch[1];
        }
    }

    // Check for <Hangup> or <Reject>
    if (xml.includes('<Hangup') || xml.includes('<Reject')) {
        hangups.push(true);
    }

    return { says, gather: gathers.length > 0, hangup: hangups.length > 0, action };
}

async function sendRequest(url, to, from, digits = '') {
    const params = new URLSearchParams();
    params.append('CallSid', callSid);
    params.append('To', to);
    params.append('From', from);
    if (digits) params.append('Digits', digits);

    // Handle relative URLs
    const fullUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;

    try {
        const res = await fetch(fullUrl, {
            method: 'POST',
            body: params,
        });
        const text = await res.text();
        return text;
    } catch (err) {
        console.error('Network Error:', err.message);
        return null;
    }
}

async function run() {
    console.log('📞 IVR Simulator 📞');
    console.log('-------------------');

    const shopPhone = await ask('Shop IVR Number', DEFAULT_SHOP_IVR);
    const callerPhone = await ask('Your Phone Number', DEFAULT_CALLER);

    console.log(`\nConnecting to ${API_URL}...`);
    console.log(`CallSid: ${callSid}\n`);

    let digits = '';
    let active = true;
    let currentUrl = API_URL;

    while (active) {
        // Send request
        const xml = await sendRequest(currentUrl, shopPhone, callerPhone, digits);
        if (!xml) break;

        // Parse Response
        const { says, gather, hangup, action } = parseTwiML(xml);

        // Speak
        says.forEach((msg) => {
            console.log(`🤖 IVR: "${msg}"`);
        });

        if (hangup) {
            console.log('\n📴 Call Ended by System.');
            active = false;
            break;
        }

        if (gather) {
            // Update URL for next request if action provided
            if (action) currentUrl = action;

            // Prompt for input
            digits = await ask('\n🔢 Enter Keys', '');
        } else {
            if (!hangup) {
                console.log('(No input requested, ending session)');
                active = false;
            }
        }
    }

    rl.close();
}

run();
