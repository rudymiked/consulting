import { Box, Typography } from "@mui/material";

const LoadScreen: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f7f9fb' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
        Loading...
      </Typography>
    </Box>
  );
}