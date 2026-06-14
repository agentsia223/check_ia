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
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";
import Logo from "./brand/Logo";

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
                    <Logo height={34} />
                </Box>

                <List sx={{ p: 0 }}>
                    {navigationItems.filter(item => item.show).map((item) => (
                        <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                component={Link}
                                to={item.path}
                                onClick={toggleMobileDrawer}
                                sx={{
                                    borderRadius: 'var(--radius-md)',
                                    py: 1.5,
                                    '&:hover': {
                                        bgcolor: 'var(--navy-50)'
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <item.icon sx={{ color: 'var(--navy-600)' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    sx={{
                                        '& .MuiListItemText-primary': {
                                            fontWeight: 500,
                                            color: 'var(--navy-900)'
                                        }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}

                    {isLoggedIn && (
                        <>
                            <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'var(--slate-500)', fontWeight: 600 }}>
                                Vérification d'Images
                            </Typography>
                            {imageVerificationItems.map((item) => (
                                <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton
                                        component={Link}
                                        to={item.path}
                                        onClick={toggleMobileDrawer}
                                        sx={{
                                            borderRadius: 'var(--radius-md)',
                                            py: 1.5,
                                            '&:hover': {
                                                bgcolor: 'var(--green-50)'
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <item.icon sx={{ color: 'var(--green-500)' }} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.label}
                                            secondary={item.description}
                                            sx={{
                                                '& .MuiListItemText-primary': {
                                                    fontWeight: 500,
                                                    color: 'var(--navy-900)'
                                                },
                                                '& .MuiListItemText-secondary': {
                                                    fontSize: '0.75rem',
                                                    color: 'var(--slate-500)'
                                                }
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </>
                    )}
                </List>

                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--border-subtle)' }}>
                    {!loading && isLoggedIn ? (
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={handleLogout}
                            startIcon={<LogoutRounded />}
                            sx={{
                                minHeight: 48,
                                borderRadius: 'var(--radius-md)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--slate-500)',
                                fontWeight: 500,
                                '&:hover': {
                                    borderColor: 'var(--red-600)',
                                    color: 'var(--red-600)',
                                    bgcolor: 'var(--red-50)'
                                }
                            }}
                        >
                            Se Déconnecter
                        </Button>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                component={Link}
                                to="/login"
                                startIcon={<LoginRounded />}
                                onClick={toggleMobileDrawer}
                                sx={{
                                    minHeight: 48,
                                    borderRadius: 'var(--radius-md)',
                                    borderColor: 'var(--navy-600)',
                                    color: 'var(--navy-600)',
                                    fontWeight: 500,
                                    '&:hover': {
                                        bgcolor: 'var(--navy-50)',
                                        borderColor: 'var(--navy-700)'
                                    }
                                }}
                            >
                                Se Connecter
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                component={Link}
                                to="/register"
                                startIcon={<PersonAddRounded />}
                                onClick={toggleMobileDrawer}
                                sx={{
                                    minHeight: 48,
                                    borderRadius: 'var(--radius-md)',
                                    bgcolor: 'var(--navy-600)',
                                    color: 'white',
                                    fontWeight: 600,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: 'var(--navy-700)',
                                        boxShadow: 'var(--shadow-sm)'
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
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--navy-900)'
                }}
            >
                <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
                    {/* Logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <Button
                            component={Link}
                            to="/"
                            aria-label="Check-IA"
                            sx={{
                                p: 0,
                                minWidth: 'auto',
                                '&:hover': {
                                    bgcolor: 'transparent'
                                }
                            }}
                        >
                            <Logo height={34} />
                        </Button>
                        {!isMobile && (
                            <Chip
                                label="Beta"
                                size="small"
                                sx={{
                                    ml: 1.5,
                                    bgcolor: 'var(--green-50)',
                                    color: 'var(--green-700)',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    height: 20,
                                    borderRadius: 'var(--radius-pill)'
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
                                        color: 'var(--slate-700)',
                                        fontWeight: 500,
                                        px: 2,
                                        py: 1,
                                        borderRadius: 'var(--radius-md)',
                                        textTransform: 'none',
                                        '&:hover': {
                                            bgcolor: 'var(--navy-50)',
                                            color: 'var(--navy-600)'
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
                                            color: 'var(--slate-700)',
                                            fontWeight: 500,
                                            px: 2,
                                            py: 1,
                                            borderRadius: 'var(--radius-md)',
                                            textTransform: 'none',
                                            '&:hover': {
                                                bgcolor: 'var(--navy-50)',
                                                color: 'var(--navy-600)'
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
                                                borderRadius: 'var(--radius-lg)',
                                                boxShadow: 'var(--shadow-lg)',
                                                border: '1px solid var(--border-subtle)',
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
                                                        bgcolor: 'var(--green-50)'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    <item.icon sx={{ color: 'var(--green-500)' }} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={item.label}
                                                    secondary={item.description}
                                                    sx={{
                                                        '& .MuiListItemText-primary': {
                                                            fontWeight: 600,
                                                            color: 'var(--navy-900)'
                                                        },
                                                        '& .MuiListItemText-secondary': {
                                                            color: 'var(--slate-500)',
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
                                                color: 'var(--slate-500)',
                                                fontWeight: 500,
                                                px: 2,
                                                py: 1,
                                                borderRadius: 'var(--radius-md)',
                                                textTransform: 'none',
                                                '&:hover': {
                                                    bgcolor: 'var(--red-50)',
                                                    color: 'var(--red-600)'
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
                                                    color: 'var(--slate-700)',
                                                    fontWeight: 500,
                                                    px: 2,
                                                    py: 1,
                                                    borderRadius: 'var(--radius-md)',
                                                    textTransform: 'none',
                                                    '&:hover': {
                                                        bgcolor: 'var(--navy-50)',
                                                        color: 'var(--navy-600)'
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
                                                    minHeight: 48,
                                                    bgcolor: 'var(--navy-600)',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    px: 3,
                                                    py: 1,
                                                    borderRadius: 'var(--radius-md)',
                                                    textTransform: 'none',
                                                    boxShadow: 'none',
                                                    '&:hover': {
                                                        bgcolor: 'var(--navy-700)',
                                                        boxShadow: 'var(--shadow-md)'
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
                                color: 'var(--slate-700)',
                                '&:hover': {
                                    bgcolor: 'var(--navy-50)',
                                    color: 'var(--navy-600)'
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
