const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

console.log('Sending test SMS...');
console.log('From:', process.env.TWILIO_PHONE_NUMBER);
console.log('To: +918248973913');

client.messages.create({
    body: '🎫 Test SMS from ServeStream Ration System! If you received this, Twilio is working correctly.',
    from: process.env.TWILIO_PHONE_NUMBER,
    to: '+918248973913'
})
    .then(message => {
        console.log('SUCCESS! Message SID:', message.sid);
        console.log('Status:', message.status);
    })
    .catch(err => {
        console.error('FAILED!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('More Info:', err.moreInfo);
    });
