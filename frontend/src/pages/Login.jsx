import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loginUser, getCurrentUser } from '../api/auth';

const Login = () => {
    const location = useLocation();
    const successMessage = location.state?.message;
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await loginUser(formData);
            // Role from stored user first, then from response (user or flat)
            const user = getCurrentUser();
            const role = (
                (user?.role ?? data?.user?.role ?? data?.role) || ''
            ).toString().toLowerCase();
            if (role === 'researcher') {
                window.location.href = '/researcher/experiments';
                return;
            }
            if (role === 'admin') {
                window.location.href = '/admin';
                return;
            }
            window.location.href = '/experiments';
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to continue your health journey</p>

                {successMessage && <div className="text-center mb-4" style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>{successMessage}</div>}
                {error && <div className="text-error text-center mb-4">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        Sign In
                    </button>
                </form>

                <div className="text-center mt-4">
                    <p className="text-sm text-blue-950">
                        Don't have an account? <Link to="/signup" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
