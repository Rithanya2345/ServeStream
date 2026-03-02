const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Check the MOST RECENT message
client.messages.list({
    to: '+918248973913',
    limit: 3
}).then(messages => {
    console.log(`Found ${messages.length} messages:\n`);
    messages.forEach((m, i) => {
        console.log(`--- Message ${i + 1} ---`);
        console.log(`SID: ${m.sid}`);
        console.log(`Status: ${m.status}`);
        console.log(`Error Code: ${m.errorCode || 'none'}`);
        console.log(`Error Msg: ${m.errorMessage || 'none'}`);
        console.log(`Date Created: ${m.dateCreated}`);
        console.log(`Date Sent: ${m.dateSent}`);
        console.log(`Body: "${m.body}"`);
        console.log(`Num Segments: ${m.numSegments}`);
        console.log('');
    });
}).catch(err => {
    console.error('Error:', err.message);
});
