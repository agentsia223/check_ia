import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    TextField,
    Button,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Card,
    IconButton,
    InputAdornment,
    Divider,
    Avatar
} from "@mui/material";
import {
    LoginRounded,
    PersonAddRounded,
    EmailRounded,
    LockRounded,
    VisibilityRounded,
    VisibilityOffRounded,
    VerifiedUser
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                navigate("/library");
            } else {
                setError(result.error || "Échec de la connexion. Veuillez réessayer.");
            }
        } catch (error) {
            setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
            console.error("Login error:", error);
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2
            }}
        >
            <Card
                elevation={0}
                sx={{
                    maxWidth: 440,
                    width: '100%',
                    p: { xs: 3, sm: 4 },
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
            >
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Avatar 
                        sx={{ 
                            bgcolor: '#2563eb', 
                            width: 64, 
                            height: 64, 
                            mx: 'auto', 
                            mb: 2 
                        }}
                    >
                        <VerifiedUser sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 700, 
                            color: '#0f172a',
                            mb: 1
                        }}
                    >
                        Bienvenue
                    </Typography>
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            color: '#64748b',
                            fontSize: '1.1rem'
                        }}
                    >
                        Connectez-vous à votre compte Check-IA
                    </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mb: 3,
                            borderRadius: 2,
                            bgcolor: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            '& .MuiAlert-icon': {
                                color: '#dc2626'
                            }
                        }}
                    >
                        {error}
                    </Alert>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                    <Box sx={{ mb: 3 }}>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 600, 
                                color: '#374151', 
                                mb: 1 
                            }}
                        >
                            Adresse e-mail
                        </Typography>
                        <TextField
                            type="email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="votre@email.com"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailRounded sx={{ color: '#9ca3af' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: '#f8fafc',
                                    '& fieldset': {
                                        borderColor: '#e2e8f0'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#cbd5e1'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#2563eb',
                                        borderWidth: 2
                                    }
                                }
                            }}
                        />
                    </Box>

                    <Box sx={{ mb: 4 }}>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 600, 
                                color: '#374151', 
                                mb: 1 
                            }}
                        >
                            Mot de passe
                        </Typography>
                        <TextField
                            type={showPassword ? "text" : "password"}
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="••••••••"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockRounded sx={{ color: '#9ca3af' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={togglePasswordVisibility}
                                            edge="end"
                                            disabled={loading}
                                            sx={{ color: '#9ca3af' }}
                                        >
                                            {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: '#f8fafc',
                                    '& fieldset': {
                                        borderColor: '#e2e8f0'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#cbd5e1'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#2563eb',
                                        borderWidth: 2
                                    }
                                }
                            }}
                        />
                    </Box>

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginRounded />}
                        sx={{
                            bgcolor: '#2563eb',
                            color: 'white',
                            fontWeight: 600,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '1rem',
                            boxShadow: 'none',
                            mb: 3,
                            '&:hover': {
                                bgcolor: '#1d4ed8',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                            },
                            '&:disabled': {
                                bgcolor: '#cbd5e1',
                                color: '#6b7280'
                            }
                        }}
                    >
                        {loading ? "Connexion en cours..." : "Se connecter"}
                    </Button>
                </form>

                {/* Divider */}
                <Divider sx={{ my: 3 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', px: 2 }}>
                        Pas encore de compte ?
                    </Typography>
                </Divider>

                {/* Register Link */}
                <Button
                    variant="outlined"
                    fullWidth
                    component={Link}
                    to="/register"
                    startIcon={<PersonAddRounded />}
                    disabled={loading}
                    sx={{
                        borderColor: '#e2e8f0',
                        color: '#475569',
                        fontWeight: 600,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': {
                            borderColor: '#2563eb',
                            color: '#2563eb',
                            bgcolor: '#f0f7ff'
                        }
                    }}
                >
                    Créer un compte
                </Button>

                {/* Footer */}
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        En vous connectant, vous acceptez nos{' '}
                        <Link 
                            to="/terms" 
                            style={{ 
                                color: '#2563eb', 
                                textDecoration: 'none',
                                fontWeight: 500
                            }}
                        >
                            conditions d'utilisation
                        </Link>
                        {' '}et notre{' '}
                        <Link 
                            to="/privacy" 
                            style={{ 
                                color: '#2563eb', 
                                textDecoration: 'none',
                                fontWeight: 500 
                            }}
                        >
                            politique de confidentialité
                        </Link>
                    </Typography>
                </Box>
            </Card>
        </Box>
    );
}

export default Login;
