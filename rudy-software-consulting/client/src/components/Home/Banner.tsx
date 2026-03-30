import { Box, Button, Container, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import ImageFadeIn from "../ImageFadeIn";
import tech from "/src/assets/tech.jpg";
import realestatedash from "/src/assets/realestatedash.png";
import realestatedashiphone from "/src/assets/realestatedashiphone.png";

const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        minHeight: { xs: 480, md: 580 },
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Background image */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${tech})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Dark gradient overlay — heavier on the left for text legibility */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(10,25,47,0.92) 0%, rgba(10,25,47,0.78) 55%, rgba(10,25,47,0.45) 100%)",
        }}
      />

      {/* Content */}
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 8, md: 6 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {/* Left: text + CTAs */}
          <Box sx={{ flex: "0 0 auto", maxWidth: { xs: "100%", md: 520 } }}>
            <Typography
              variant="overline"
              sx={{
                color: "#60a5fa",
                fontWeight: 700,
                letterSpacing: 2,
                mb: 1.5,
                display: "block",
                fontSize: "0.75rem",
              }}
            >
              Technology Consulting &amp; Software Development
            </Typography>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                color: "white",
                fontWeight: 800,
                lineHeight: 1.15,
                mb: 2.5,
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              }}
            >
              Software Solutions That Drive Business Growth
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{
                color: "rgba(255,255,255,0.78)",
                fontWeight: 400,
                mb: 4,
                fontSize: { xs: "1rem", md: "1.1rem" },
                lineHeight: 1.7,
              }}
            >
              Custom web apps, managed IT services, and AI-powered solutions —
              we help businesses transform their technology and stay ahead of
              the competition.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                component={Link}
                to="/contact"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: "#2563eb",
                  color: "white",
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: "none",
                  fontSize: "1rem",
                  "&:hover": { bgcolor: "#1d4ed8" },
                }}
              >
                Get a Free Quote
              </Button>
              <Button
                component={Link}
                to="/software"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "rgba(255,255,255,0.5)",
                  color: "white",
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: "none",
                  fontSize: "1rem",
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                Our Services
              </Button>
            </Box>
          </Box>

          {/* Right: product screenshots, hidden on mobile */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flex: 1,
              justifyContent: "flex-end",
              position: "relative",
              minHeight: 340,
            }}
          >
            <Box sx={{ position: "relative", width: "100%", maxWidth: 460 }}>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
                  border: "2px solid rgba(255,255,255,0.1)",
                }}
              >
                <ImageFadeIn
                  src={realestatedash}
                  alt="Real Estate Dashboard"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </Box>
              <Box
                sx={{
                  position: "absolute",
                  bottom: -24,
                  right: -16,
                  borderRadius: 2,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
                }}
              >
                <ImageFadeIn
                  src={realestatedashiphone}
                  alt="Mobile App"
                  style={{ width: 130, height: "auto", display: "block" }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Banner;
