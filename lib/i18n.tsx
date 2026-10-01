"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react";

export type Language = "en" | "fr";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyOrText: string, fallback?: string) => string;
  isFrench: boolean;
};

const STORAGE_KEY = "nua-arte:language";

// Comprehensive French translations for the entire NUA-ARTE platform
const DICTIONARY: Record<string, string> = {
  // Navigation & Header
  "Artists": "Artistes",
  "Galleries": "Galeries",
  "Virtual Gallery": "Galerie Virtuelle",
  "Collections": "Collections",
  "Exhibitions": "Expositions",
  "Journal": "Journal",
  "Search": "Rechercher",
  "Search artists, countries, artworks…": "Rechercher des artistes, pays, œuvres…",
  "Search name, city, technique…": "Rechercher par nom, ville, technique…",
  "Close search": "Fermer la recherche",
  "Open menu": "Ouvrir le menu",
  "Close menu": "Fermer le menu",
  "Join the Circle": "Rejoindre le Cercle",
  "Dashboard": "Tableau de bord",
  "Admin": "Administration",
  "Sign out": "Se déconnecter",
  "Sign in": "Se connecter",
  "Theme": "Thème",
  "Language": "Langue",

  // Site Footer
  "Stay in the circle.": "Restez dans le cercle.",
  "Stay in": "Restez dans",
  "the circle.": "le cercle.",
  "Editorials, new artist drops, and private viewing invites — delivered with intention.":
    "Éditoriaux, nouvelles parutions d'artistes et invitations privées — livrés avec intention.",
  "Your email address": "Votre adresse e-mail",
  "Subscribe": "S'abonner",
  "Explore": "Explorer",
  "Discover": "Découvrir",
  "Circle": "Cercle",
  "My Collection": "Ma Collection",
  "Saved & Enquiries": "Favoris & Demandes",
  "About": "À propos",
  "FAQ": "FAQ",
  "Press": "Presse",
  "Lagos · Dakar · Johannesburg · Lisboa": "Lagos · Dakar · Johannesburg · Lisbonne",

  // Homepage Hero
  "Est. 2024 — The Circle": "Ést. 2024 — Le Cercle",
  "Explore Africa.": "Explorez l'Afrique.",
  "Discover Art.": "Découvrez l'Art.",
  "A curated platform dedicated to contemporary African artists. Each country, each culture, each story — collected with intent.":
    "Une plateforme dédiée aux artistes contemporains africains. Chaque pays, chaque culture, chaque histoire — rassemblés avec intention.",
  "Explore artists": "Explorer les artistes",

  // Homepage Atlas Map
  "The Living Atlas": "L'Atlas Vivant",
  "54 Nations. One Continent.": "54 Nations. Un Continent.",
  "Explore the contemporary creative landscape across every African border. Tap any nation to discover artists, sounds, and active exhibitions.":
    "Explorez le paysage créatif contemporain à travers chaque frontière africaine. Touchez une nation pour découvrir artistes, sons et expositions en cours.",
  "EXPLORE AFRICA": "EXPLORER L'AFRIQUE",
  "Explore Africa": "Explorer l'Afrique",
  "DISCOVER ART": "DÉCOUVRIR L'ART",
  "Discover Art": "Découvrir l'Art",
  "ARTISTS": "ARTISTES",
  "ARTWORKS": "ŒUVRES",
  "STORIES": "RÉCITS",
  "EXHIBITIONS": "EXPOSITIONS",
  "COLLECTORS": "COLLECTIONNEURS",
  "ABOUT US": "À PROPOS",
  "ONE CONTINENT.": "UN CONTINENT.",
  "INFINITE VOICES.": "DES VOIX INFINIES.",
  "ARTISTS REPRESENTED": "ARTISTES REPRÉSENTÉS",
  "ARTWORKS AVAILABLE": "ŒUVRES DISPONIBLES",
  "COUNTRIES": "PAYS",
  "COLLECTORS WORLDWIDE": "COLLECTIONNEURS DANS LE MONDE",
  "SCROLL TO EXPLORE": "DÉFILEZ POUR EXPLORER",
  "VIEW ALL COUNTRIES": "VOIR TOUS LES PAYS",
  "Explore Artists & Works →": "Explorer Artistes & Œuvres →",
  "Search 54 African countries…": "Rechercher parmi 54 pays africains…",
  "The Discovery Map": "La Carte Découverte",
  "The Atlas, in Full.": "L'Atlas au Complet.",
  "← Back to Home": "← Retour à l'Accueil",
  "Hover a country to see its name, click to open its full spotlight page. 54 nations, filterable by medium.":
    "Survolez un pays pour voir son nom, cliquez pour ouvrir sa page dédiée. 54 nations, filtrables par technique.",
  "Filter by Medium:": "Filtrer par technique :",
  "All Mediums": "Toutes les techniques",
  "Mixed Media": "Techniques Mixtes",
  "Other": "Autre",
  "Sound On": "Son Activé",
  "Muted": "Muet",
  "Mute sound": "Couper le son",
  "Unmute sound": "Activer le son",
  "Zoom In": "Zoom avant",
  "Zoom Out": "Zoom arrière",
  "Reset Zoom": "Réinitialiser le zoom",
  "RESET": "RÉINIT",
  "Territories": "Territoires",
  "Artworks": "Œuvres",
  "Active Works": "Œuvres actives",
  "Artists in Circle": "Artistes du Cercle",
  "Explore Gallery": "Explorer la galerie",
  "Capital": "Capitale",
  "Region": "Région",
  "North": "Nord",
  "West": "Ouest",
  "Central": "Centre",
  "East": "Est",
  "Southern": "Austral",
  "Listen to local soundscape": "Écouter le paysage sonore local",
  "No sound available": "Aucun son disponible",
  "Close drawer": "Fermer le volet",
  "Select a territory": "Sélectionnez un territoire",

  // Homepage Sections
  "Curatorial Focus": "Regard Curatorial",
  "Featured Artists": "Artistes en Vedette",
  "AFRICAN ARTISTS": "ARTISTES AFRICAINS",
  "African Arts": "Arts Africains",
  "Featured work:": "Œuvre en vedette :",
  "Medium:": "Technique :",
  "Visit Virtual Museum": "Visiter le Musée Virtuel",
  "Pioneers and emerging voices defining contemporary practice across the continent.":
    "Pionniers et voix émergentes façonnant la création contemporaine à travers le continent.",
  "View Profile": "Voir le profil",
  "Explore all artists": "Explorer tous les artistes",
  "Collector Picks": "Choix des Collectionneurs",
  "Curated works of high distinction and provenance, available for direct acquisition.":
    "Œuvres remarquables de provenance certifiée, disponibles pour une acquisition directe.",
  "CURATORIAL SELECTION": "SÉLECTION CURATORIALE",
  "MOST REQUESTED": "LES PLUS DEMANDÉES",
  "Price Upon Request": "Prix sur demande",
  "Inquire": "Demander le prix",
  "54 Countries": "54 Pays",
  "Explore by territory": "Explorer par territoire",
  "Every country holds distinct aesthetic traditions, materiality, and contemporary inquiries. Journey through the continent nation by nation.":
    "Chaque pays porte des traditions esthétiques, des matières et des questionnements contemporains distincts. Parcourez le continent nation par nation.",
  "Explore all nations": "Explorer toutes les nations",
  "Every country, a voice. Every artist, a legacy.": "Chaque pays, une voix. Chaque artiste, un héritage.",
  "Direct Artist Payouts": "Paiements directs aux artistes",
  "Countries Curated": "Pays explorés",
  "Authenticity Guaranteed": "Authenticité garantie",
  "Verified Provenance": "Provenance vérifiée",
  "01 Discover": "01 Découvrir",
  "Browse our curated selection of emerging talent from across the continent, updated weekly.":
    "Parcourez notre sélection de talents émergents du continent, mise à jour chaque semaine.",
  "02 Save": "02 Sauvegarder",
  "Follow your favorite artists and build a digital portfolio of works that resonate with you.":
    "Suivez vos artistes favoris et composez un portfolio numérique d'œuvres qui vous inspirent.",
  "03 Collect": "03 Collectionner",
  "Inquire about original pieces. We handle authentication, logistics, and direct artist payment.":
    "Faites une demande pour des pièces originales. Nous gérons l'authentification, la logistique et la rémunération directe de l'artiste.",
  "04 Support": "04 Soutenir",
  "Every acquisition directly funds the artist and fuels cultural sustainability initiatives.":
    "Chaque acquisition finance directement l'artiste et nourrit des initiatives de développement culturel durable.",
  "BE THE FIRST": "SOYEZ AUX PREMIÈRES LOGES",
  "Receive new artists before the world sees them.": "Découvrez les nouveaux artistes avant le monde entier.",
  "EMAIL ADDRESS": "ADRESSE E-MAIL",
  "NO SPAM. JUST PURE ART DIRECT TO YOUR INBOX.": "AUCUN SPAM. UNIQUEMENT DE L'ART DIRECTEMENT DANS VOTRE BOÎTE.",

  // About Page
  "Our Mission": "Notre Mission",
  "Every country, a voice.": "Chaque pays, une voix.",
  "Every artist, a legacy.": "Chaque artiste, un héritage.",
  "NUA-ARTE Collective exists to close the distance between contemporary African artists and the collectors, curators, and institutions who should already know their work. We built a curated, country-by-country platform — not an algorithmic marketplace — because discovery should feel like travel, not scrolling.":
    "Le Collectif NUA-ARTE est né pour combler la distance entre les artistes contemporains africains et les collectionneurs, conservateurs et institutions qui devraient connaître leur œuvre. Nous avons bâti une plateforme curatoriale, pays par pays — et non une place de marché algorithmique — parce que la découverte artistique doit être un voyage, pas un défilement d'écran.",
  "The Vision": "La Vision",
  "Sustainable, direct, artist-first.": "Durable, direct, tourné vers l'artiste.",
  "Every acquisition made through NUA-ARTE pays the artist directly — no galleries taking 50%+ margins, no middlemen deciding whose story gets told. Our curators travel to 54 countries to find work before it's discovered by anyone else, then build the infrastructure — authentication, shipping, provenance — collectors need to trust it.":
    "Chaque acquisition réalisée via NUA-ARTE rémunère directement l'artiste — sans galeries prélevant plus de 50 % de marge, sans intermédiaires imposant les récits. Nos curateurs parcourent 54 pays pour dénicher des œuvres inédites, puis établissent l'infrastructure — authentification, expédition, traçabilité — essentielle à la confiance des collectionneurs.",
  "Today the Circle represents 120+ artists. Every one of them was found, not submitted.":
    "Aujourd'hui, le Cercle rassemble plus de 120 artistes. Chacun d'eux a été découvert, jamais sélectionné sur dossier.",
  "Artists Discovered": "Artistes Découverts",
  "Nations Represented": "Nations Représentées",
  "Founded": "Fondation",
  "Paid Direct to Artist": "Versé Directement à l'Artiste",
  "Join the Circle.": "Rejoignez le Cercle.",
  "Whether you're collecting your first piece or your fiftieth, every acquisition through NUA-ARTE directly supports an artist's practice and a nation's cultural visibility.":
    "Que vous fassiez l'acquisition de votre première œuvre ou de votre cinquantième, chaque achat sur NUA-ARTE soutient directement la démarche d'un artiste et le rayonnement culturel d'une nation.",
  "Explore Artists": "Explorer les Artistes",
  "Read the FAQ": "Consulter la FAQ",

  // FAQ Page
  "Support": "Support",
  "Frequently Asked Questions": "Foire Aux Questions",
  "Can't find what you're looking for?": "Vous ne trouvez pas ce que vous cherchez ?",
  "Learn more about us": "En savoir plus sur nous",
  "or reach out through any artwork's enquiry form.": "ou contactez-nous via le formulaire d'une œuvre.",
  "How does pricing work?": "Comment fonctionne la tarification ?",
  "All prices are Upon Request. Submit an enquiry from any artwork page and one of our curators will follow up directly with pricing, availability, and shipping details — usually within 1–2 business days.":
    "Tous les prix sont Sur Demande. Envoyez une demande depuis la page d'une œuvre et l'un de nos curateurs vous répondra directement avec le prix, la disponibilité et les modalités d'expédition — généralement sous 1 à 2 jours ouvrés.",
  "Are the artworks authenticated?": "Les œuvres sont-elles authentifiées ?",
  "Yes. Every acquisition ships with a hand-signed Certificate of Authenticity, and provenance is documented from the artist's studio through to delivery.":
    "Oui. Chaque acquisition est accompagnée d'un certificat d'authenticité signé à la main, et la provenance est documentée depuis l'atelier de l'artiste jusqu'à la livraison.",
  "Do you ship internationally?": "Expédiez-vous à l'international ?",
  "Yes — insured, white-glove shipping in custom-built wooden crates is available worldwide. Shipping is quoted alongside your price after an enquiry.":
    "Oui — une expédition assurée de haute qualité en caisses de bois sur mesure est disponible dans le monde entier. Le coût de transport est chiffré avec le prix après votre demande.",
  "How are artists selected?": "Comment les artistes sont-ils sélectionnés ?",
  "Our curators travel to source work directly — nothing on NUA-ARTE is submitted through an open call. Every artist is discovered, vetted, and onboarded by our team before their work appears on the platform.":
    "Nos curateurs voyagent pour trouver les œuvres directement — aucune soumission spontanée sur NUA-ARTE. Chaque artiste est découvert, évalué et intégré par notre équipe avant d'apparaître sur la plateforme.",
  "Do artists get paid directly?": "Les artistes sont-ils payés directement ?",
  "Yes. NUA-ARTE pays artists directly rather than routing sales through traditional gallery margins, so more of every acquisition supports the artist's practice.":
    "Oui. NUA-ARTE rémunère les artistes directement plutôt que de prélever des marges de galerie traditionnelles, garantissant qu'une part maximale de chaque vente finance leur travail artistique.",
  "Can I become an artist on NUA-ARTE?": "Puis-je devenir artiste sur NUA-ARTE ?",
  "Sign up at /auth and choose the 'artist' role to set up a studio profile. Our curatorial team reviews new artist accounts before their work goes live.":
    "Inscrivez-vous sur /auth et choisissez le rôle 'artiste' pour configurer votre atelier. Notre équipe curatoriale examine les nouveaux comptes avant la mise en ligne.",
  "What's the difference between the Virtual Gallery and Discover pages?":
    "Quelle est la différence entre la Galerie Virtuelle et les pages Découverte ?",
  "The Virtual Gallery is a fully 3D, walkable museum experience. Discover pages are editorial, country-by-country spotlights with curated works, artist stories, and stats — both link back to the same artist and artwork detail pages.":
    "La Galerie Virtuelle est une expérience de musée 3D immersive et navigable. Les pages Découverte offrent un éclairage éditorial pays par pays avec des œuvres sélectionnées, des récits et des données — les deux mènent aux mêmes fiches artistes et œuvres.",

  // Artists Directory
  "The Movement": "Le Mouvement",
  "All": "Tous",
  "New Discoveries": "Nouvelles Découvertes",
  "Painting": "Peinture",
  "Sculpture": "Sculpture",
  "Photography": "Photographie",
  "Textile": "Textile",
  "Digital": "Numérique",
  "All countries (54)": "Tous les pays (54)",
  "No artists match your filters.": "Aucun artiste ne correspond à vos filtres.",
  "Reset filters": "Réinitialiser les filtres",
  "works": "œuvres",
  "work": "œuvre",
  "worksCount": "nombre d'œuvres",
  "Showing": "Affichage de",
  "of": "sur",

  // Collections & Exhibitions
  "Curated Collections": "Collections Curatées",
  "Explore Curated Collections": "Explorer les Collections",
  "Country": "Pays",
  "Medium": "Médium / Technique",
  "Reset all": "Tout réinitialiser",
  "EXHIBITIONS PROGRAM": "PROGRAMME DES EXPOSITIONS",
  "Curation of": "Curation de",
  "Continental Spirit": "L'Esprit Continental",
  "Curatorial Exhibitions": "Expositions Curatoriales",
  "Past Exhibitions": "Expositions Passées",
  "Current Exhibitions": "Expositions en cours",
  "Upcoming Exhibitions": "Prochaines Expositions",
  "View Exhibition": "Voir l'exposition",

  // Virtual Museum
  "VIRTUAL EXHIBITION": "EXPOSITION VIRTUELLE",
  "THE VIRTUAL MUSEUM": "LE MUSÉE VIRTUEL",
  "Enter Virtual Museum": "Entrer dans le Musée Virtuel",
  "IMMERSIVE EXPERIENCE": "EXPÉRIENCE IMMERSIVE",
  "Virtual Museum Explorer": "Explorateur du Musée Virtuel",
  "IMMERSIVE MODE": "MODE IMMERSIF",
  "Click to enter the museum": "Cliquez pour entrer dans le musée",
  "WASD · MOVE": "WASD · DÉPLACER",
  "MOUSE · LOOK": "SOURIS · REGARDER",
  "ESC · EXIT": "ÉCHAP · QUITTER",
  "CURRENT LOCATION": "EMPLACEMENT ACTUEL",
  "ARTWORKS LOADED": "ŒUVRES CHARGÉES",
  "ZONES": "ZONES",
  "ZONE 01: ANCESTRAL ROOTS": "ZONE 01 : RACINES ANCESTRALES",
  "ZONE 02: URBAN RHYTHM": "ZONE 02 : RYTHME URBAIN",
  "ZONE 03: WOVEN THREADS": "ZONE 03 : FILS TISSÉS",
  "ZONE 04: DIGITAL HORIZONS": "ZONE 04 : HORIZONS NUMÉRIQUES",
  "Connect with the Curators": "Échanger avec les Conservateurs",
  "Our curators are available for virtual consultations regarding any of the featured works in the Virtual Museum collection.":
    "Nos curateurs sont à votre disposition pour des consultations virtuelles concernant les œuvres présentées dans la collection du Musée Virtuel.",
  "A living archive of contemporary African creativity. Move through four thematic halls — from ancestral roots to digital futures — and experience the breadth of the continent's visual imagination.":
    "Une archive vivante de la créativité contemporaine africaine. Parcourez quatre salles thématiques — des racines ancestrales aux avenirs numériques — et explorez l'imaginaire visuel du continent.",

  // Journal
  "Read Time": "Temps de lecture",
  "Topic": "Thème",
  "Share": "Partager",
  "The Journal": "Le Journal",
  "Latest from the Journal": "Derniers articles du Journal",
  "Minutes": "Minutes",
  "Read Article": "Lire l'article",

  // Artwork & Details
  "Origin": "Origine",
  "Selected Works": "Œuvres Sélectionnées",
  "About the Artist": "À propos de l'artiste",
  "Artist Statement": "Démarche de l'artiste",
  "Related Works": "Œuvres associées",
  "Reviews & Collector Notes": "Avis & Notes des Collectionneurs",
  "Certificate of Authenticity": "Certificat d'Authenticité",
  "Save": "Sauvegarder",
  "Saved": "Sauvegardé",
  "Save Artist": "Suivre l'artiste",
  "Follow Artist": "Suivre",
  "Following": "Suivi",
  "Inquire About This Work": "Demander le prix de cette œuvre",
  "Request Price": "Demander le prix",
  "Price": "Prix",
  "Dimensions": "Dimensions",
  "Year": "Année",
  "Status": "Statut",
  "Available": "Disponible",
  "Acquired": "Acquise",

  // Enquiries & Checkout
  "Inquire about": "Demande pour",
  "Your Name": "Votre nom",
  "Email Address": "Adresse e-mail",
  "Phone (optional)": "Téléphone (optionnel)",
  "Message (optional)": "Message (optionnel)",
  "Submit Request": "Envoyer la demande",
  "Submitting…": "Envoi en cours…",
  "Thank you for your enquiry": "Merci pour votre demande",
  "One of our curators will contact you within 24 hours.": "L'un de nos curateurs vous répondra dans les 24 heures.",
  "Close": "Fermer",
  "Secure Checkout": "Paiement Sécurisé",
  "Artwork": "Œuvre",
  "Total": "Total",
  "Pay with Card": "Payer par carte",
  "Processing…": "Traitement en cours…",
  "Payment Successful!": "Paiement réussi !",
  "Thank you for acquiring": "Merci d'avoir acquis",
  "Your transaction has been processed securely.": "Votre transaction a été traitée en toute sécurité.",
  "Back to Home": "Retour à l'accueil",

  // Auth & Account
  "Sign in to the Circle": "Connexion au Cercle",
  "Create your account": "Créer votre compte",
  "Reset your password": "Réinitialiser votre mot de passe",
  "Update Password": "Mettre à jour le mot de passe",
  "Email": "E-mail",
  "Password": "Mot de passe",
  "Confirm Password": "Confirmer le mot de passe",
  "Display Name": "Nom d'affichage",
  "Country of origin": "Pays d'origine",
  "Select your role": "Sélectionnez votre rôle",
  "Collector / Enthusiast": "Collectionneur / Amateur",
  "Curator / Gallery": "Curateur / Galerie",
  "Sign In": "Se connecter",
  "Sign Up": "S'inscrire",
  "Continue with Google": "Continuer avec Google",
  "Forgot password?": "Mot de passe oublié ?",
  "Don't have an account?": "Vous n'avez pas de compte ?",
  "Already have an account?": "Vous avez déjà un compte ?",
  "Back to Sign In": "Retour à la connexion",
  "Saved Works": "Œuvres sauvegardées",
  "Followed Artists": "Artistes suivis",
  "My Orders": "Mes Commandes",
  "Enquiries & Quotes": "Demandes & Devis",
  "Profile": "Profil",
  "Settings": "Paramètres",
  "Manage Artworks": "Gérer les Œuvres",
  "Add Artwork": "Ajouter une Œuvre",
  "Save Changes": "Enregistrer les modifications",
  "Cancel": "Annuler",
  "Edit": "Modifier",
  "Delete": "Supprimer",

  // Country Names (French)
  "Algeria": "Algérie",
  "Angola": "Angola",
  "Benin": "Bénin",
  "Botswana": "Botswana",
  "Burkina Faso": "Burkina Faso",
  "Burundi": "Burundi",
  "Cabo Verde": "Cap-Vert",
  "Cameroon": "Cameroun",
  "Central African Republic": "République centrafricaine",
  "Chad": "Tchad",
  "Comoros": "Comores",
  "Republic of the Congo": "République du Congo",
  "Democratic Republic of the Congo": "République démocratique du Congo",
  "Djibouti": "Djibouti",
  "Egypt": "Égypte",
  "Equatorial Guinea": "Guinée équatoriale",
  "Eritrea": "Érythrée",
  "eSwatini": "Eswatini",
  "Ethiopia": "Éthiopie",
  "Gabon": "Gabon",
  "Gambia": "Gambie",
  "Ghana": "Ghana",
  "Guinea": "Guinée",
  "Guinea-Bissau": "Guinée-Bissau",
  "Ivory Coast": "Côte d'Ivoire",
  "Kenya": "Kenya",
  "Lesotho": "Lesotho",
  "Liberia": "Libéria",
  "Libya": "Libye",
  "Madagascar": "Madagascar",
  "Malawi": "Malawi",
  "Mali": "Mali",
  "Mauritania": "Mauritanie",
  "Mauritius": "Maurice",
  "Morocco": "Maroc",
  "Mozambique": "Mozambique",
  "Namibia": "Namibie",
  "Niger": "Niger",
  "Nigeria": "Nigéria",
  "Rwanda": "Rwanda",
  "São Tomé and Principe": "Sao Tomé-et-Principe",
  "Senegal": "Sénégal",
  "Seychelles": "Seychelles",
  "Sierra Leone": "Sierra Leone",
  "Somalia": "Somalie",
  "South Africa": "Afrique du Sud",
  "South Sudan": "Soudan du Sud",
  "Sudan": "Soudan",
  "Tanzania": "Tanzanie",
  "United Republic of Tanzania": "République-Unie de Tanzanie",
  "Togo": "Togo",
  "Tunisia": "Tunisie",
  "Uganda": "Ouganda",
  "Zambia": "Zambie",
  "Zimbabwe": "Zimbabwe",

  // Auth
  "Welcome back": "Bon retour",
  "Join the circle": "Rejoindre le cercle",
  "Account recovery": "Récupération de compte",
  "Set new password": "Définir un nouveau mot de passe",
  "Create an account": "Créer un compte",
  "Reset password": "Réinitialiser le mot de passe",
  "Update password": "Mettre à jour le mot de passe",
  "I am a…": "Je suis…",
  "Buyer": "Acheteur",
  "Artist": "Artiste",
  "Discover, save and acquire artworks.": "Découvrez, sauvegardez et acquérez des œuvres.",
  "Publish your portfolio and sell originals.": "Publiez votre portfolio et vendez des originaux.",
  "Sign in with Google": "Se connecter avec Google",
  "Sign up with Google": "S'inscrire avec Google",
  "Or continue with email": "Ou continuer avec l'e-mail",
  "Display name": "Nom d'affichage",
  "Registered country": "Pays d'enregistrement",
  "Select your country": "Sélectionnez votre pays",
  "Your submitted artworks must be associated with this country.":
    "Les œuvres soumises doivent être associées à ce pays.",
  "New Password": "Nouveau mot de passe",
  "Confirm New Password": "Confirmer le nouveau mot de passe",
  "Create account": "Créer un compte",
  "Send reset link": "Envoyer le lien de réinitialisation",
  "Don't have an account? Sign up": "Pas encore de compte ? S'inscrire",
  "Already have an account? Sign in": "Déjà un compte ? Se connecter",
  "← Back to sign in": "← Retour à la connexion",
  "Passwords do not match.": "Les mots de passe ne correspondent pas.",
  "Password must be at least 6 characters long.": "Le mot de passe doit contenir au moins 6 caractères.",
  "Password updated successfully!": "Mot de passe mis à jour avec succès !",
  "Your password has been reset successfully. Redirecting to your dashboard...":
    "Votre mot de passe a été réinitialisé. Redirection vers votre tableau de bord…",
  "We sent a password reset link to your email inbox. Please check your email to proceed.":
    "Nous avons envoyé un lien de réinitialisation à votre boîte e-mail. Veuillez vérifier vos messages.",
  "Password reset link sent to your email": "Lien de réinitialisation envoyé à votre e-mail",

  // Search
  "Clear search": "Effacer la recherche",
  "Start typing to search across artists, countries, and artworks.":
    "Commencez à taper pour rechercher artistes, pays et œuvres.",
  "results": "résultats",
  "result": "résultat",
  "for": "pour",
  "No results for": "Aucun résultat pour",
  "Try a different term.": "Essayez un autre terme.",
  "Countries": "Pays",

  // Collections
  "Reset": "Réinitialiser",
  "View As:": "Afficher en :",
  "Grid view": "Vue grille",
  "List view": "Vue liste",
  "No collections match your filters.": "Aucune collection ne correspond à vos filtres.",
  "Never Miss a New Collection": "Ne manquez aucune nouvelle collection",
  "Be the first to receive our curated catalogues and invitations to private artist viewings.":
    "Soyez les premiers à recevoir nos catalogues et invitations aux vernissages privés.",
  "artwork": "œuvre",
  "artworks": "œuvres",

  // Virtual Gallery extras
  "THE VIRTUAL": "LE MUSÉE",
  "MUSEUM": "VIRTUEL",
  "LOADING MUSEUM…": "CHARGEMENT DU MUSÉE…",
  "MAP · VIEW": "CARTE · VUE",
  "Toggle fullscreen": "Plein écran",

  // Enquiry modal
  "Close modal": "Fermer la fenêtre",
  "Inquiry Dispatched": "Demande envoyée",
  "Curatorial Request Sent": "Demande curatoriale envoyée",
  "Return to Gallery": "Retour à la galerie",
  "Private Curatorial Advisory": "Conseil curatorial privé",
  "Request Pricing & Provenance": "Demander prix & provenance",
  "Provide your contact details below to receive current availability, pricing guide, and shipping options.":
    "Indiquez vos coordonnées ci-dessous pour recevoir disponibilité, guide tarifaire et options d'expédition.",
  "Full Name": "Nom complet",
  "Phone / WhatsApp": "Téléphone / WhatsApp",
  "(Optional)": "(Optionnel)",
  "Message / Special Requirements": "Message / Exigences particulières",
  "Mention any specific questions regarding framing, global insured transport, or presentation...":
    "Mentionnez vos questions sur l'encadrement, le transport assuré international ou la présentation…",
  "Dispatching Request...": "Envoi de la demande…",
  "Submit Pricing Inquiry": "Envoyer la demande de prix",
  "Direct & Private Communication • Guaranteed Response within 24h":
    "Communication directe et privée • Réponse garantie sous 24 h",
  "By": "Par",

  // Checkout / quote
  "Sign in to purchase": "Se connecter pour acheter",
  "Opening secure checkout…": "Ouverture du paiement sécurisé…",
  "Buy now": "Acheter maintenant",
  "Unable to start checkout.": "Impossible de démarrer le paiement.",

  // Artwork actions & reviews
  "Certificate": "Certificat",
  "Edition": "Édition",
  "Unique piece (1 of 1)": "Pièce unique (1 sur 1)",
  "Certificate No.": "N° de certificat",
  "Link copied to clipboard": "Lien copié dans le presse-papiers",
  "Couldn't copy the link": "Impossible de copier le lien",
  "Saved to your collection": "Ajouté à votre collection",
  "Removed from your collection": "Retiré de votre collection",
  "Remove from saved works": "Retirer des œuvres sauvegardées",
  "Save this artwork": "Sauvegarder cette œuvre",
  "Collector Reviews": "Avis des collectionneurs",
  "No reviews yet — be the first to review this piece.":
    "Pas encore d'avis — soyez le premier à commenter cette œuvre.",
  "Leave a review": "Laisser un avis",
  "Share your experience with this piece…": "Partagez votre expérience avec cette œuvre…",
  "Posting…": "Publication…",
  "Post Review": "Publier l'avis",
  "Sign in to leave a review": "Connectez-vous pour laisser un avis",
  "Pick a star rating first": "Choisissez d'abord une note",
  "Couldn't submit your review. Please try again.": "Impossible d'envoyer votre avis. Réessayez.",
  "Review posted — thank you": "Avis publié — merci",
  "View fullscreen": "Voir en plein écran",
  "Reset zoom": "Réinitialiser le zoom",

  // Common extras
  "Title": "Titre",
  "Issued": "Émis le",
  "Loading…": "Chargement…",
  "Load more": "Charger plus",
  "Print / Save as PDF": "Imprimer / Enregistrer en PDF",
  "This certifies that the above work has been authenticated by NUA-ARTE's curatorial team and is sold with full provenance documentation.": "Ce document certifie que l'œuvre ci-dessus a été authentifiée par l'équipe curatoriale de NUA-ARTE et est vendue avec une documentation de provenance complète.",
  "View Bio": "Voir la Bio",
  "NEW DISCOVERY": "NOUVELLE DÉCOUVERTE",
  "WORKS": "ŒUVRES",
  "CURATED AFRICAN ART": "ART AFRICAIN SÉLECTIONNÉ",
  "Follow": "Suivre",
  "Unfollow": "Ne plus suivre",
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Read stored language preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === "fr" || stored === "en") {
        setLanguageState(stored);
        document.documentElement.lang = stored;
      } else {
        document.documentElement.lang = "en";
      }
    } catch {
      // Ignore storage errors in private mode
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {}
  }, []);

  const t = useCallback(
    (keyOrText: string, fallback?: string): string => {
      if (language === "en") return keyOrText;
      const trimmed = keyOrText.trim();
      if (DICTIONARY[trimmed]) {
        // Preserve any leading/trailing spaces
        const leading = keyOrText.match(/^\s*/)?.[0] ?? "";
        const trailing = keyOrText.match(/\s*$/)?.[0] ?? "";
        return leading + DICTIONARY[trimmed] + trailing;
      }
      return fallback ?? keyOrText;
    },
    [language],
  );

  // Client-side text node observer: when French is selected, also translate matching DOM text nodes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalTextMap = new WeakMap<Text, string>();

    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const val = textNode.nodeValue || "";
        const trimmed = val.trim();
        if (!trimmed) return;

        if (language === "fr") {
          const french = DICTIONARY[trimmed];
          if (french && french !== trimmed) {
            if (!originalTextMap.has(textNode)) {
              originalTextMap.set(textNode, val);
            }
            const leading = val.match(/^\s*/)?.[0] ?? "";
            const trailing = val.match(/\s*$/)?.[0] ?? "";
            textNode.nodeValue = leading + french + trailing;
          }
        } else {
          if (originalTextMap.has(textNode)) {
            textNode.nodeValue = originalTextMap.get(textNode)!;
          }
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        !["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"].includes((node as Element).tagName)
      ) {
        node.childNodes.forEach(translateNode);
      }
    };

    // Run initial scan
    translateNode(document.body);

    // Watch for dynamic DOM mutations / route transitions
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach(translateNode);
        } else if (m.type === "characterData") {
          translateNode(m.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isFrench: language === "fr",
    }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: "en",
      setLanguage: () => {},
      t: (keyOrText: string, fallback?: string) => keyOrText,
      isFrench: false,
    };
  }
  return ctx;
}
