import { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  Container
} from '@mui/material';
import '../../styles/main.css';

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  const handleChange = (e: any) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" gutterBottom>
          Getting in Touch:
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} direction="column">
            <Box>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                variant="outlined"
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                type="email"
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                variant="outlined"
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="About Your Project"
                name="message"
                value={formData.message}
                onChange={handleChange}
                variant="outlined"
                multiline
                rows={4}
              />
            </Box>
            <Box>
              <Button className="main-button" type="submit" variant="contained" fullWidth>
                Submit
              </Button>
            </Box>
          </Grid>
        </form>
      </Box>
    </Container>
  );
};

export default ContactForm;
