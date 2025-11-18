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
import HttpClient from '../../services/Http/HttpClient';
import { useAuth } from '../Auth/AuthContext';

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
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');
  const httpClient = new HttpClient();
  const auth = useAuth(); 

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
    setIsError(false);
    setMessage('');
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.company || !formData.message) {
      setIsError(true);
      setMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    httpClient.post<{ message: string; error?: string }>({
      url: '/api/contact',
      token: auth.token || '',
      data: buildEmail(formData)
    })
      .then(res => {
        const { message, error } = res;

        if (error) {
          throw new Error(error);
        }

        setFormData({
          name: '',
          email: '',
          company: '',
          message: '',
        });
        setIsSubmitted(true);
      }
      ).catch(error => {
        setIsError(true);
        setMessage('There was an error submitting the form. Please try again.');
        console.error('Error:', error);
      })
      .finally(() => {
        setIsSubmitting(false);
        setIsError(false);
        setMessage(successMessage);
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
            <Typography variant="body1" color={isError ? "error" : "success.main"} align="center" sx={{ mt: 2 }}>
              {message}
            </Typography>
          </Grid>
        </form>
      </Box>
    </Container>
  );
};

export default ContactForm;
