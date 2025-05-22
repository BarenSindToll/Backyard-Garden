import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null); // full user object
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:4000/api/user/get-profile', {
            method: 'GET',
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, loading }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook
export const useUser = () => useContext(UserContext);
