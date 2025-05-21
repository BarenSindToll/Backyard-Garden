export async function fetchCurrentUser() {
    try {
        const res = await fetch('http://localhost:4000/api/user/get-profile', {
            method: 'GET',
            credentials: 'include',
        });

        if (res.status === 401 || res.status === 403) {
            throw new Error('Session expired');
        }

        const data = await res.json();
        if (data.success) return data.user;
        throw new Error(data.message || 'Failed to fetch user');
    } catch (err) {
        console.error('Auth error:', err.message);
        localStorage.clear();
        window.location.href = '/signin';
        return null;
    }
}
