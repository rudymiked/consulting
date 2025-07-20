import { Box, Button, Grid, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import ImageFadeIn from "../components/ImageFadeIn";
import tech from "../assets/tech.jpg";
import marathon from "/src/assets/marathon.png";
import realestatedash from "/src/assets/realestatedash.png";

const Banner: React.FC = () => {
  return (
    <Box sx={{ py: 6, position: "relative" }}>
      {/* Background image with fade-in */}
      <Box sx={{ width: "100%" }}>
        <ImageFadeIn
          src={tech}
          alt="Banner"
          style={{ width: "100%", height: 550, objectFit: "cover", objectPosition: "left center", borderRadius: 1 }}
          sx={(theme: any) => ({
            [theme.breakpoints.down('sm')]: {
              height: 500,
            },
          })}
        />
      </Box>

      <Grid container spacing={2}>
        {/* Overlay box remains unchanged */}
        <Box
          sx={(theme) => ({
            position: "absolute",
            top: 100,
            left: 20,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: 3,
            borderRadius: 2,
            maxWidth: 300,
            boxShadow: 3,
            [theme.breakpoints.down("sm")]: {
              padding: 2,
              height: "60%",
              justifyContent: "flex-start",
            },
          })}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={(theme) => ({
                [theme.breakpoints.down("sm")]: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "1.3rem",
                },
              })}
            >
              Software Solutions and Consulting
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={(theme) => ({
                fontSize: "1rem",
                [theme.breakpoints.down("sm")]: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "1.2rem",
                },
              })}
            >
              Transform your ideas into reality with expert custom tailored software. Our services include custom software development for web, desktop and mobile, SaaS, API integrations, and enterprise consulting.
            </Typography>
            <Link to="/contact">
              <Button className="main-button" variant="contained" color="primary" sx={{ mt: 1 }}>
                Get Started
              </Button>
            </Link>
          </Box>
        </Box>

        {/* Marathon image with fade-in */}
        <Box
          sx={(theme) => ({
            position: "absolute",
            top: 120,
            right: 75,
            boxShadow: 0,
            [theme.breakpoints.down("md")]: {
              display: "none",
            },
          })}
        >
          <ImageFadeIn
            src={marathon}
            alt="Marathon"
            style={{ width: 450, height: "auto", borderRadius: 1 }}
          />
        </Box>

        {/* Real Estate Dashboard image with fade-in */}
        <Box
          sx={(theme) => ({
            position: "absolute",
            top: 70,
            right: 20,
            boxShadow: 0,
            [theme.breakpoints.down("md")]: {
              display: "none",
            },
          })}
        >
          <ImageFadeIn
            src={realestatedash}
            alt="Real Estate Dashboard"
            style={{ width: 450, height: "auto", borderRadius: 1 }}
          />
        </Box>
      </Grid>
    </Box>
  );
};

export default Banner;
