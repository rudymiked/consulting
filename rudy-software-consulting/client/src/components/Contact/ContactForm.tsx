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
import { CircularProgress } from '@mui/material';

export interface IFormData {
  name: string;
  email: string;
  company: string;
  message: string;
}

const successMessage: string = 'Thank you for contacting us! We will get back to you soon.';

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<IFormData>({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, SetMessage] = useState('');

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

    if (!formData.name || !formData.email || !formData.message) {
      SetMessage('Please fill in all required fields.');
      return;
    }
    
    setIsSubmitting(true);
    
    fetch(`https://${import.meta.env.VITE_API_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildEmail(formData)),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Success:', data);
        setFormData({
          name: '',
          email: '',
          company: '',
          message: '',
        });
        setIsSubmitted(true);
      })
      .catch(error => {
        console.error('Error:', error);
      })
      .finally(() => {
        setIsSubmitting(false);
        SetMessage(successMessage);
      });
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
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
                We guarentee a response within 24 hours. We will never share your email or personal information with anyone.
              </Typography>
            </Box>
              <Button
                className="main-button"
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                sx={{ position: 'relative' }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress
                      size={24}
                      color="inherit"
                      thickness={5}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                      }}
                    />
                    Please Wait
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            {isSubmitted && (
              <Typography variant="body1" color="success.main" align="center" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Grid>
        </form>
      </Box>
    </Container>
  );
};

export default ContactForm;
