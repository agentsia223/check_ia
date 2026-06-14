// Adding logic to handle missing sources in the Library component, and integrating more intuitive pagination

import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import {
    Container,
    Typography,
    CircularProgress,
    List,
    ListItem,
    Alert,
    Box,
    Paper,
    Divider,
    Button,
} from "@mui/material";
import { AuthContext } from "../utils/AuthContext";
import Logo from "./brand/Logo";

function Library() {
    const [facts, setFacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isLoggedIn, getAccessToken } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState(1);
    const factsPerPage = 3;

    useEffect(() => {
        if (!isLoggedIn) {
            // If not logged in, reset state to indicate user is not authorized
            setFacts([]);
            setError("Connectez-vous pour voir la liste des faits vérifiés");
            setLoading(false);
            return;
        }

        // If user is logged in, make an API request to fetch facts
        setLoading(true);
        setError(null); // Clear previous errors

        const token = getAccessToken();

        axios
            .get(`${API_BASE_URL}facts/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                const seenTextes = new Set();
                const uniqueFacts = response.data.filter((fact) => {
                    if (seenTextes.has(fact.texte)) {
                        return false;
                    }
                    seenTextes.add(fact.texte);
                    return true;
                });

                setFacts(uniqueFacts);
                setLoading(false);
            })
            .catch((error) => {
                setError(
                    "Erreur lors de la récupération des faits. Connectez-vous pour voir la liste des faits vérifiés."
                );
                console.error(
                    "Erreur lors de la récupération des faits :",
                    error
                );
                setLoading(false);
            });
    }, [isLoggedIn, getAccessToken]); // React to changes in authentication state

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="80vh"
                sx={{ bgcolor: "var(--slate-50)" }}
            >
                <CircularProgress sx={{ color: "var(--navy-600)" }} />
            </Box>
        );
    }

    function formatDate(dateString) {
        const dateObj = new Date(dateString);
        return dateObj.toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "2-digit",
        });
    }

    // Get current facts for pagination
    const indexOfLastFact = currentPage * factsPerPage;
    const indexOfFirstFact = indexOfLastFact - factsPerPage;
    const currentFacts = facts.slice(indexOfFirstFact, indexOfLastFact);
    const totalPages = Math.ceil(facts.length / factsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prevPage) => prevPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage((prevPage) => prevPage - 1);
        }
    };

    return (
        <Container maxWidth="md">
            <Box
                sx={{
                    mt: 4,
                    mb: 3,
                    px: { xs: 3, sm: 5 },
                    py: { xs: 4, sm: 5 },
                    background: "var(--navy-600)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-md)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 2,
                }}
            >
                <Logo white height={40} />
                <Typography
                    variant="h3"
                    component="h1"
                    gutterBottom
                    textAlign="center"
                    sx={{
                        m: 0,
                        color: "#ffffff",
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                    }}
                >
                    Bibliothèque de Faits Vérifiés
                </Typography>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    sx={{
                        marginBottom: 2,
                        borderRadius: "var(--radius-md)",
                        fontFamily: "var(--font-body)",
                        border: "1px solid var(--red-200)",
                    }}
                >
                    {error}
                </Alert>
            )}

            {facts.length > 0 ? (
                <>
                    <List sx={{ marginTop: 4 }}>
                        {currentFacts.map((fact) => {
                            return (
                                <ListItem key={fact.id} disablePadding>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            padding: 3,
                                            width: "100%",
                                            marginBottom: 2,
                                            backgroundColor: "var(--surface-card)",
                                            border: "1px solid var(--slate-200)",
                                            borderRadius: "var(--radius-lg)",
                                            boxShadow: "var(--shadow-sm)",
                                            transition:
                                                "box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)",
                                            "&:hover": {
                                                boxShadow: "var(--shadow-md)",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                marginBottom: 2,
                                                fontWeight: 700,
                                                fontFamily: "var(--font-display)",
                                                color: "var(--navy-900)",
                                                lineHeight: 1.35,
                                            }}
                                        >
                                            {fact.texte}
                                        </Typography>
                                        <Divider
                                            sx={{
                                                marginBottom: 2,
                                                borderColor: "var(--slate-200)",
                                            }}
                                        />
                                        <Box
                                            display="flex"
                                            flexDirection="column"
                                            gap={1}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                                sx={{
                                                    fontFamily:
                                                        "var(--font-mono)",
                                                    color: "var(--slate-500)",
                                                    fontSize: "0.8125rem",
                                                }}
                                            >
                                                Date : {formatDate(fact.date)}
                                            </Typography>
                                            <Box
                                                display="flex"
                                                flexWrap="wrap"
                                                alignItems="center"
                                                gap={1}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: "var(--navy-900)",
                                                    }}
                                                >
                                                    Mots-clés :
                                                </Typography>
                                                {fact.mots_cles.length > 0 ? (
                                                    fact.mots_cles.map(
                                                        (keyword, index) => (
                                                            <Typography
                                                                key={index}
                                                                variant="body2"
                                                                component="span"
                                                                sx={{
                                                                    backgroundColor:
                                                                        "var(--navy-50)",
                                                                    color: "var(--navy-700)",
                                                                    fontWeight: 600,
                                                                    border: "1px solid var(--navy-100)",
                                                                    padding:
                                                                        "2px 10px",
                                                                    borderRadius:
                                                                        "var(--radius-pill)",
                                                                    lineHeight: 1.6,
                                                                }}
                                                            >
                                                                {keyword.mot}
                                                            </Typography>
                                                        )
                                                    )
                                                ) : (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: "var(--slate-500)",
                                                        }}
                                                    >
                                                        Aucun mot-clé disponible
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: "var(--slate-500)",
                                                }}
                                            >
                                                Source :{" "}
                                                {fact.source ? (
                                                    <a
                                                        href={fact.source}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            fontFamily:
                                                                "var(--font-mono)",
                                                            fontSize: "0.8125rem",
                                                            color: "var(--navy-600)",
                                                            wordBreak: "break-all",
                                                        }}
                                                    >
                                                        {fact.source}
                                                    </a>
                                                ) : (
                                                    "Source non disponible"
                                                )}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </ListItem>
                            );
                        })}
                    </List>

                    {/* Pagination Controls */}
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ marginTop: 3, marginBottom: 3 }}
                    >
                        <Button
                            variant="outlined"
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            sx={{
                                minHeight: "var(--hit-target)",
                                px: 3,
                                borderRadius: "var(--radius-md)",
                                textTransform: "none",
                                fontWeight: 600,
                                color: "var(--navy-600)",
                                borderColor: "var(--navy-600)",
                                "&:hover": {
                                    borderColor: "var(--navy-700)",
                                    backgroundColor: "var(--navy-50)",
                                },
                            }}
                        >
                            Précédent
                        </Button>
                        <Typography
                            variant="body1"
                            sx={{
                                fontFamily: "var(--font-mono)",
                                color: "var(--navy-900)",
                                fontWeight: 500,
                            }}
                        >
                            Page {currentPage} sur {totalPages}
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            sx={{
                                minHeight: "var(--hit-target)",
                                px: 3,
                                borderRadius: "var(--radius-md)",
                                textTransform: "none",
                                fontWeight: 600,
                                color: "#ffffff",
                                backgroundColor: "var(--navy-600)",
                                boxShadow: "var(--shadow-xs)",
                                "&:hover": {
                                    backgroundColor: "var(--navy-700)",
                                    boxShadow: "var(--shadow-sm)",
                                },
                            }}
                        >
                            Suivant
                        </Button>
                    </Box>
                </>
            ) : (
                !error && (
                    <Typography
                        variant="h6"
                        textAlign="center"
                        sx={{
                            marginTop: 4,
                            fontFamily: "var(--font-display)",
                            color: "var(--slate-500)",
                            fontWeight: 600,
                        }}
                    >
                        Aucun fait vérifié disponible pour le moment.
                    </Typography>
                )
            )}
        </Container>
    );
}

export default Library;
