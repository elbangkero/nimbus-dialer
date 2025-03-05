const axios = require('axios');

(async function () {
    const url = 'https://call.flyfonetalk.com/call/iframe.html?code=19a04d6ae3e382a86229740a17307c22';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            }
        });
        const html = response.data;
        const regex = /(?:webcallApi\.csrf_name\s*=\s*'([^']+)'|webcallApi\.csrf_hash\s*=\s*'([^']+)'|var\s+(\w+)\s*=\s*'([^']*)')/g;
        let match;
        const data = {};

        while ((match = regex.exec(html)) !== null) {
            if (match[1]) {
                data['csrf_name'] = match[1];
            } else if (match[2]) {
                data['csrf_hash'] = match[2];
            } else if (match[3] && match[4]) {
                data[match[3]] = match[4];
            }
        }
        const fina_data = Object.keys(data).length ? data : null;

        console.log('SIP Info:', fina_data);
    } catch (error) {
        console.error('Error fetching iframe:', error);
    }
})();