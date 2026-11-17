import axios from 'axios';

const userClient = axios.create({
    baseURL: process.env.USER_SERVICE_URL || 'http://localhost:3001/api',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

class UserClient {
    async getUserById(userId) {
        const response = await userClient.get(`/users/${userId}`);
        return response.data.user;
    }
}

export default new UserClient();
