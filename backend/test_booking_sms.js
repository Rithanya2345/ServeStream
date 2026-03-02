// End-to-end booking test to check SMS delivery
const cardNumber = '330300000001';

async function testBooking() {
    try {
        // 1. First cancel any existing active tokens
        console.log('Step 1: Checking for active tokens...');
        const statusRes = await fetch('http://localhost:5000/api/chatbot/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_number: cardNumber })
        });
        const statusData = await statusRes.json();
        console.log('Status response:', JSON.stringify(statusData, null, 2));

        // 2. Get card details (need shop_id)
        console.log('\nStep 2: Getting card details...');
        const cardRes = await fetch('http://localhost:5000/api/chatbot/card-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_number: cardNumber })
        });
        const cardData = await cardRes.json();
        console.log('Card shop_id:', cardData.data?.shop_id);
        console.log('Card mobile:', cardData.data?.mobile_number);

        if (statusData.data) {
            console.log('\nActive token found! Need to cancel it first.');
            console.log('Skipping booking test - cancel the existing token first.');
            return;
        }

        // 3. Book token
        console.log('\nStep 3: Booking token...');
        const bookRes = await fetch('http://localhost:5000/api/chatbot/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                card_number: cardNumber,
                shop_id: cardData.data.shop_id
            })
        });
        const bookData = await bookRes.json();
        console.log('Booking response:', JSON.stringify(bookData, null, 2));

        if (bookData.success) {
            console.log('\n✅ Token booked! SMS should have been triggered.');
            console.log('Check your phone for the SMS.');
            console.log('Also check the backend terminal for [SMS] logs.');
        } else {
            console.log('\n❌ Booking failed:', bookData.message);
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

testBooking();
