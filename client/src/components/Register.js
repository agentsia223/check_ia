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
    Avatar,
    Grid
} from "@mui/material";
import {
    PersonAddRounded,
    LoginRounded,
    EmailRounded,
    LockRounded,
    VisibilityRounded,
    VisibilityOffRounded,
    PersonRounded,
    VerifiedUser
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";

function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            setLoading(false);
            return;
        }

        // Validate password length
        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            setLoading(false);
            return;
        }

        // Validate name fields
        if (!firstName.trim() || !lastName.trim()) {
            setError("Veuillez renseigner votre prénom et nom.");
            setLoading(false);
            return;
        }

        try {
            const result = await register(email, password, {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                },
            });

            if (result.success) {
                setSuccess("Inscription réussie ! Vérification de votre email en cours...");
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else {
                setError(result.error || "Échec de l'inscription. Veuillez réessayer.");
            }
        } catch (error) {
            setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
            console.error("Registration error:", error);
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                py: 4
            }}
        >
            <Card
                elevation={0}
                sx={{
                    maxWidth: 500,
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
                        Créer un compte
                    </Typography>
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            color: '#64748b',
                            fontSize: '1.1rem'
                        }}
                    >
                        Rejoignez Check-IA pour vérifier les informations
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

                {/* Success Alert */}
                {success && (
                    <Alert 
                        severity="success" 
                        sx={{ 
                            mb: 3,
                            borderRadius: 2,
                            bgcolor: '#f0fdf4',
                            color: '#16a34a',
                            border: '1px solid #bbf7d0',
                            '& .MuiAlert-icon': {
                                color: '#16a34a'
                            }
                        }}
                    >
                        {success}
                    </Alert>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit}>
                    {/* Name Fields */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6}>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    fontWeight: 600, 
                                    color: '#374151', 
                                    mb: 1 
                                }}
                            >
                                Prénom
                            </Typography>
                            <TextField
                                fullWidth
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                disabled={loading}
                                placeholder="Jean"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonRounded sx={{ color: '#9ca3af' }} />
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
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    fontWeight: 600, 
                                    color: '#374151', 
                                    mb: 1 
                                }}
                            >
                                Nom
                            </Typography>
                            <TextField
                                fullWidth
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                disabled={loading}
                                placeholder="Dupont"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonRounded sx={{ color: '#9ca3af' }} />
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
                        </Grid>
                    </Grid>

                    {/* Email Field */}
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
                            placeholder="jean@example.com"
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

                    {/* Password Fields */}
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6}>
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
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    fontWeight: 600, 
                                    color: '#374151', 
                                    mb: 1 
                                }}
                            >
                                Confirmer le mot de passe
                            </Typography>
                            <TextField
                                type={showConfirmPassword ? "text" : "password"}
                                fullWidth
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                                                onClick={toggleConfirmPasswordVisibility}
                                                edge="end"
                                                disabled={loading}
                                                sx={{ color: '#9ca3af' }}
                                            >
                                                {showConfirmPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
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
                        </Grid>
                    </Grid>

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddRounded />}
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
                        {loading ? "Création du compte..." : "Créer mon compte"}
                    </Button>
                </form>

                {/* Divider */}
                <Divider sx={{ my: 3 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', px: 2 }}>
                        Déjà un compte ?
                    </Typography>
                </Divider>

                {/* Login Link */}
                <Button
                    variant="outlined"
                    fullWidth
                    component={Link}
                    to="/login"
                    startIcon={<LoginRounded />}
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
                    Se connecter
                </Button>

                {/* Footer */}
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        En créant un compte, vous acceptez nos{' '}
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

export default Register;
