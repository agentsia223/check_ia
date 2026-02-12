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
            >
                <CircularProgress />
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
            <Typography
                variant="h3"
                component="h1"
                gutterBottom
                textAlign="center"
                marginTop={4}
                sx={{
                    backgroundColor: "#F5F5F5", // Couleur de fond verte pour attirer l'attention
                    color: "black", // Texte en blanc pour un bon contraste
                    padding: 2, // Espace autour du texte
                    borderRadius: 2, // Bordures arrondies pour un effet de carte
                    fontFamily: "'Roboto Condensed', sans-serif",
                    // Utilisation d'une police différente pour donner un effet distinct
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)", // Légère ombre pour donner de la profondeur
                }}
            >
                Bibliothèque de Faits Vérifiés
            </Typography>

            {error && (
                <Alert severity="error" sx={{ marginBottom: 2 }}>
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
                                        elevation={3}
                                        sx={{
                                            padding: 3,
                                            width: "100%",
                                            marginBottom: 2,
                                            backgroundColor: "#f9f9f9",
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                marginBottom: 2,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {fact.texte}
                                        </Typography>
                                        <Divider sx={{ marginBottom: 2 }} />
                                        <Box
                                            display="flex"
                                            flexDirection="column"
                                            gap={1}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                            >
                                                Date : {formatDate(fact.date)}
                                            </Typography>
                                            <Box
                                                display="flex"
                                                flexWrap="wrap"
                                                gap={1}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                    sx={{ fontWeight: "bold" }}
                                                >
                                                    Mots-clés :
                                                </Typography>
                                                {fact.mots_cles.length > 0 ? (
                                                    fact.mots_cles.map(
                                                        (keyword, index) => (
                                                            <Typography
                                                                key={index}
                                                                variant="body2"
                                                                color="textSecondary"
                                                                sx={{
                                                                    backgroundColor:
                                                                        "#e0f7fa",
                                                                    padding:
                                                                        "2px 8px",
                                                                    borderRadius:
                                                                        "12px",
                                                                }}
                                                            >
                                                                {keyword.mot}
                                                            </Typography>
                                                        )
                                                    )
                                                ) : (
                                                    <Typography
                                                        variant="body2"
                                                        color="textSecondary"
                                                    >
                                                        Aucun mot-clé disponible
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                            >
                                                Source :{" "}
                                                {fact.source ? (
                                                    <a
                                                        href={fact.source}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
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
                        >
                            Précédent
                        </Button>
                        <Typography variant="body1">
                            Page {currentPage} sur {totalPages}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
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
                        sx={{ marginTop: 4 }}
                    >
                        Aucun fait vérifié disponible pour le moment.
                    </Typography>
                )
            )}
        </Container>
    );
}

export default Library;
