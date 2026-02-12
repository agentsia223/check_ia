import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    useMediaQuery,
    useTheme,
    Avatar,
    Chip,
} from "@mui/material";
import {
    ArrowDropDown,
    Image as ImageIcon,
    Psychology,
    FactCheck,
    MenuRounded,
    HomeRounded,
    LibraryBooksRounded,
    LogoutRounded,
    LoginRounded,
    PersonAddRounded,
    VerifiedUser,
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";

function Navigation() {
    const { isLoggedIn, logout, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [imageMenuAnchor, setImageMenuAnchor] = useState(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const handleLogout = async () => {
        try {
            const result = await logout();
            if (result.success) {
                navigate("/");
            } else {
                console.error("Logout failed:", result.error);
            }
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const handleImageMenuOpen = (event) => {
        setImageMenuAnchor(event.currentTarget);
    };

    const handleImageMenuClose = () => {
        setImageMenuAnchor(null);
    };

    const handleImageMenuClick = (path) => {
        navigate(path);
        handleImageMenuClose();
    };

    const toggleMobileDrawer = () => {
        setMobileDrawerOpen(!mobileDrawerOpen);
    };

    const navigationItems = [
        {
            label: "Accueil",
            path: "/",
            icon: HomeRounded,
            show: true
        },
        {
            label: "Bibliothèque",
            path: "/library",
            icon: LibraryBooksRounded,
            show: true
        },
        {
            label: "Vérifier du Texte",
            path: "/submit",
            icon: FactCheck,
            show: isLoggedIn
        }
    ];

    const imageVerificationItems = [
        {
            label: "Contenu d'Image",
            description: "Vérifier les affirmations sur une image",
            path: "/verify-image",
            icon: ImageIcon
        },
        {
            label: "Détection IA",
            description: "Détecter les images générées par IA",
            path: "/detect-ai-image",
            icon: Psychology
        }
    ];

    const MobileDrawer = () => (
        <Drawer
            anchor="right"
            open={mobileDrawerOpen}
            onClose={toggleMobileDrawer}
            sx={{
                '& .MuiDrawer-paper': {
                    width: 280,
                    bgcolor: 'white',
                    boxShadow: 'none',
                    border: 'none'
                }
            }}
        >
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#2563eb', mr: 2, width: 40, height: 40 }}>
                        <VerifiedUser />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Check-IA
                    </Typography>
                </Box>

                <List sx={{ p: 0 }}>
                    {navigationItems.filter(item => item.show).map((item) => (
                        <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                component={Link}
                                to={item.path}
                                onClick={toggleMobileDrawer}
                                sx={{
                                    borderRadius: 2,
                                    py: 1.5,
                                    '&:hover': {
                                        bgcolor: '#f1f5f9'
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <item.icon sx={{ color: '#2563eb' }} />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={item.label}
                                    sx={{
                                        '& .MuiListItemText-primary': {
                                            fontWeight: 500,
                                            color: '#0f172a'
                                        }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}

                    {isLoggedIn && (
                        <>
                            <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: '#64748b', fontWeight: 600 }}>
                                Vérification d'Images
                            </Typography>
                            {imageVerificationItems.map((item) => (
                                <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton
                                        component={Link}
                                        to={item.path}
                                        onClick={toggleMobileDrawer}
                                        sx={{
                                            borderRadius: 2,
                                            py: 1.5,
                                            '&:hover': {
                                                bgcolor: '#f1f5f9'
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <item.icon sx={{ color: '#f59e0b' }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={item.label}
                                            secondary={item.description}
                                            sx={{
                                                '& .MuiListItemText-primary': {
                                                    fontWeight: 500,
                                                    color: '#0f172a'
                                                },
                                                '& .MuiListItemText-secondary': {
                                                    fontSize: '0.75rem',
                                                    color: '#64748b'
                                                }
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </>
                    )}
                </List>

                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e2e8f0' }}>
                    {!loading && isLoggedIn ? (
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={handleLogout}
                            startIcon={<LogoutRounded />}
                            sx={{
                                borderColor: '#e2e8f0',
                                color: '#64748b',
                                fontWeight: 500,
                                '&:hover': {
                                    borderColor: '#ef4444',
                                    color: '#ef4444',
                                    bgcolor: '#fef2f2'
                                }
                            }}
                        >
                            Se Déconnecter
                        </Button>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                component={Link}
                                to="/login"
                                startIcon={<LoginRounded />}
                                onClick={toggleMobileDrawer}
                                sx={{
                                    bgcolor: '#2563eb',
                                    fontWeight: 600,
                                    '&:hover': {
                                        bgcolor: '#1d4ed8'
                                    }
                                }}
                            >
                                Se Connecter
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                component={Link}
                                to="/register"
                                startIcon={<PersonAddRounded />}
                                onClick={toggleMobileDrawer}
                                sx={{
                                    borderColor: '#2563eb',
                                    color: '#2563eb',
                                    fontWeight: 500,
                                    '&:hover': {
                                        bgcolor: '#f0f7ff',
                                        borderColor: '#2563eb'
                                    }
                                }}
                            >
                                S'Inscrire
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
        </Drawer>
    );

    return (
        <>
            <AppBar 
                position="static" 
                elevation={0}
                sx={{ 
                    bgcolor: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#0f172a'
                }}
            >
                <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
                    {/* Logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <Avatar sx={{ bgcolor: '#2563eb', mr: 2, width: 40, height: 40 }}>
                            <VerifiedUser />
                        </Avatar>
                        <Button
                            component={Link}
                            to="/"
                            sx={{ 
                                p: 0,
                                minWidth: 'auto',
                                color: '#0f172a',
                                '&:hover': {
                                    bgcolor: 'transparent'
                                }
                            }}
                        >
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                Check-IA
                            </Typography>
                        </Button>
                        {!isMobile && (
                            <Chip
                                label="Beta"
                                size="small"
                                sx={{
                                    ml: 1,
                                    bgcolor: '#f59e0b',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    height: 20
                                }}
                            />
                        )}
                    </Box>

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {navigationItems.filter(item => item.show).map((item) => (
                                <Button
                                    key={item.path}
                                    component={Link}
                                    to={item.path}
                                    startIcon={<item.icon />}
                                    sx={{
                                        color: '#475569',
                                        fontWeight: 500,
                                        px: 2,
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        '&:hover': {
                                            bgcolor: '#f1f5f9',
                                            color: '#2563eb'
                                        }
                                    }}
                                >
                                    {item.label}
                                </Button>
                            ))}

                            {/* Image Verification Dropdown */}
                            {isLoggedIn && (
                                <>
                                    <Button
                                        onClick={handleImageMenuOpen}
                                        endIcon={<ArrowDropDown />}
                                        startIcon={<ImageIcon />}
                                        sx={{
                                            color: '#475569',
                                            fontWeight: 500,
                                            px: 2,
                                            py: 1,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            '&:hover': {
                                                bgcolor: '#f1f5f9',
                                                color: '#2563eb'
                                            }
                                        }}
                                    >
                                        Images
                                    </Button>
                                    <Menu
                                        anchorEl={imageMenuAnchor}
                                        open={Boolean(imageMenuAnchor)}
                                        onClose={handleImageMenuClose}
                                        sx={{
                                            '& .MuiPaper-root': {
                                                borderRadius: 3,
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                                border: '1px solid #f1f5f9',
                                                mt: 1
                                            }
                                        }}
                                    >
                                        {imageVerificationItems.map((item) => (
                                            <MenuItem
                                                key={item.path}
                                                onClick={() => handleImageMenuClick(item.path)}
                                                sx={{
                                                    px: 3,
                                                    py: 2,
                                                    '&:hover': {
                                                        bgcolor: '#f8fafc'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    <item.icon sx={{ color: '#f59e0b' }} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={item.label}
                                                    secondary={item.description}
                                                    sx={{
                                                        '& .MuiListItemText-primary': {
                                                            fontWeight: 600,
                                                            color: '#0f172a'
                                                        },
                                                        '& .MuiListItemText-secondary': {
                                                            color: '#64748b',
                                                            fontSize: '0.8rem'
                                                        }
                                                    }}
                                                />
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </>
                            )}

                            {/* Auth Buttons */}
                            {!loading && (
                                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isLoggedIn ? (
                                        <Button
                                            onClick={handleLogout}
                                            startIcon={<LogoutRounded />}
                                            sx={{
                                                color: '#64748b',
                                                fontWeight: 500,
                                                px: 2,
                                                py: 1,
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                '&:hover': {
                                                    bgcolor: '#fef2f2',
                                                    color: '#ef4444'
                                                }
                                            }}
                                        >
                                            Déconnexion
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                component={Link}
                                                to="/login"
                                                sx={{
                                                    color: '#475569',
                                                    fontWeight: 500,
                                                    px: 2,
                                                    py: 1,
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    '&:hover': {
                                                        bgcolor: '#f1f5f9',
                                                        color: '#2563eb'
                                                    }
                                                }}
                                            >
                                                Connexion
                                            </Button>
                                            <Button
                                                variant="contained"
                                                component={Link}
                                                to="/register"
                                                sx={{
                                                    bgcolor: '#2563eb',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    px: 3,
                                                    py: 1,
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    boxShadow: 'none',
                                                    '&:hover': {
                                                        bgcolor: '#1d4ed8',
                                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                                    }
                                                }}
                                            >
                                                S'Inscrire
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <IconButton
                            onClick={toggleMobileDrawer}
                            sx={{
                                color: '#475569',
                                '&:hover': {
                                    bgcolor: '#f1f5f9'
                                }
                            }}
                        >
                            <MenuRounded />
                        </IconButton>
                    )}
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer */}
            <MobileDrawer />
        </>
    );
}

export default Navigation;
