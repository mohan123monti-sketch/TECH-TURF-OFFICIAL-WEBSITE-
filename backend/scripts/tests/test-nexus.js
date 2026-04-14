import axios from 'axios';
import fs from 'fs';

async function test() {
    try {
        const response = await axios.post("http://192.168.1.6:8000/api/chat", {
            message: "Say 'apples'"
        }, {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": "nx_1d284ac51863a365befd56663228376e96b14f3308ec9a29"
            }
        });
        fs.writeFileSync("output_nexus.json", JSON.stringify(response.data, null, 2));
    } catch (e) {
        fs.writeFileSync("output_nexus.json", JSON.stringify(e.response ? e.response.data : e.message, null, 2));
    }
}
test();
