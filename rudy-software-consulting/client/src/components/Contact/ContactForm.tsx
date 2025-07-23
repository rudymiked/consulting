import React, { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  Container
} from '@mui/material';
import '../../styles/main.css';

export interface IFormData {
  name: string;
  email: string;
  company: string;
  message: string;
}

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<IFormData>({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  React.useEffect(() => {
    console.log(import.meta.env.VITE_API_URL);
  }, []);

  const handleChange = (e: any) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const buildEmail = (formData: IFormData) => {
    return {
      to: `${import.meta.env.VITE_EMAIL_USERNAME}`,
      subject: `Contact Form Submission from ${formData.name}`,
      text: `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\nMessage: ${formData.message}`,
      html: `<p>Name: ${formData.name}</p>
              <p>Email: ${formData.email}</p>
              <p>Company: ${formData.company}</p>
              <p>Message: ${formData.message}</p>`
    };
  }

  const handleSubmit = (e: any) => {
    e.preventDefault();
    
    fetch(`https://${import.meta.env.VITE_API_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildEmail(formData)),
    }).then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }).then(data => {
      console.log('Success:', data);
      // Optionally reset form or show success message
      setFormData({
        name: '',
        email: '',
        company: '',
        message: '',
      });
    }) .catch((error) => {
      console.error('Error:', error);
      // Optionally show error message to user
    });

    // sendEmail({
    //   to: 'rudymiked@gmail.com',
    //   subject: `Contact Form Submission from ${formData.name}`,
    //   text: `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\nMessage: ${formData.message}`,
    //   html: `<p>Name: ${formData.name}</p>
    //           <p>Email: ${formData.email}</p>
    //           <p>Company: ${formData.company}</p>
    //           <p>Message: ${formData.message}</p>`
    // })
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 5 }}>
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
            <Box>
              <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
                We guarentee a response within 24 hours. We will never share your email or personal information with anyone.
              </Typography>
            </Box>
          </Grid>
        </form>
      </Box>
    </Container>
  );
};

export default ContactForm;
