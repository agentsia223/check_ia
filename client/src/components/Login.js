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
    Divider
} from "@mui/material";
import {
    LoginRounded,
    PersonAddRounded,
    EmailRounded,
    LockRounded,
    VisibilityRounded,
    VisibilityOffRounded
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";
import Logo from "./brand/Logo";

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
                bgcolor: 'var(--slate-50)',
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
                    borderRadius: 'var(--radius-lg)',
                    bgcolor: 'var(--slate-0)',
                    border: '1px solid var(--slate-200)',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
                        <Logo height={40} />
                    </Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            color: 'var(--navy-900)',
                            mb: 1
                        }}
                    >
                        Bienvenue
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'var(--slate-500)',
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
                            borderRadius: 'var(--radius-md)',
                            bgcolor: '#fef2f2',
                            color: 'var(--red-600)',
                            border: '1px solid #fecaca',
                            '& .MuiAlert-icon': {
                                color: 'var(--red-600)'
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
                                color: 'var(--slate-700)',
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
                                        <EmailRounded sx={{ color: 'var(--slate-400)' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 'var(--radius-md)',
                                    bgcolor: 'var(--slate-50)',
                                    '& fieldset': {
                                        borderColor: 'var(--slate-200)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'var(--slate-300)'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'var(--navy-600)',
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
                                color: 'var(--slate-700)',
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
                                        <LockRounded sx={{ color: 'var(--slate-400)' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={togglePasswordVisibility}
                                            edge="end"
                                            disabled={loading}
                                            sx={{ color: 'var(--slate-400)' }}
                                        >
                                            {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 'var(--radius-md)',
                                    bgcolor: 'var(--slate-50)',
                                    '& fieldset': {
                                        borderColor: 'var(--slate-200)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'var(--slate-300)'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'var(--navy-600)',
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
                            bgcolor: 'var(--green-500)',
                            color: 'white',
                            fontWeight: 600,
                            py: 1.5,
                            minHeight: 48,
                            borderRadius: 'var(--radius-md)',
                            textTransform: 'none',
                            fontSize: '1rem',
                            boxShadow: 'none',
                            mb: 3,
                            '&:hover': {
                                bgcolor: 'var(--green-600)',
                                boxShadow: 'var(--shadow-md)'
                            },
                            '&:disabled': {
                                bgcolor: 'var(--slate-300)',
                                color: 'var(--slate-500)'
                            }
                        }}
                    >
                        {loading ? "Connexion en cours..." : "Se connecter"}
                    </Button>
                </form>

                {/* Divider */}
                <Divider sx={{ my: 3, borderColor: 'var(--slate-200)' }}>
                    <Typography variant="body2" sx={{ color: 'var(--slate-500)', px: 2 }}>
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
                        borderColor: 'var(--navy-600)',
                        color: 'var(--navy-600)',
                        fontWeight: 600,
                        py: 1.5,
                        minHeight: 48,
                        borderRadius: 'var(--radius-md)',
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': {
                            borderColor: 'var(--navy-700)',
                            color: 'var(--navy-700)',
                            bgcolor: 'var(--navy-50)'
                        }
                    }}
                >
                    Créer un compte
                </Button>

                {/* Footer */}
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography variant="body2" sx={{ color: 'var(--slate-500)' }}>
                        En vous connectant, vous acceptez nos{' '}
                        <Link
                            to="/terms"
                            style={{
                                color: 'var(--navy-600)',
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
                                color: 'var(--navy-600)',
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
