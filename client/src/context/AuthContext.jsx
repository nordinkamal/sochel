import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                localStorage.setItem('token', token);
                try {
                    const res = await fetch('/api/profile/me', {
                        headers: {
                            'x-auth-token': token
                        }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setUser(data.user);
                    } else {
                        localStorage.removeItem('token');
                        setToken(null);
                        setUser(null);
                    }
                } catch (err) {
                    console.error('Error loading user:', err);
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            } else {
                localStorage.removeItem('token');
                setUser(null);
            }
            setLoading(false);
        };

        loadUser();
    }, [token]);

    const login = async (email, password) => {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const contentType = res.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                // If not JSON, it's likely an error page or simple text
                data = { msg: text || res.statusText };
            }

            if (res.ok) {
                setToken(data.token);
                return { success: true };
            } else {
                return { success: false, msg: data.msg };
            }
        } catch (err) {
            console.error("Login error:", err);
            return { success: false, msg: "Network or Server Error" };
        }
    };

    const register = async (username, email, password) => {
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const contentType = res.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { msg: text || res.statusText };
            }

            if (res.ok) {
                setToken(data.token);
                return { success: true };
            } else {
                return { success: false, msg: data.msg };
            }
        } catch (err) {
            console.error("Register error:", err);
            return { success: false, msg: "Network or Server Error" };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
