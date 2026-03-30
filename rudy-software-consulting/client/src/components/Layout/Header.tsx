import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Link, useLocation } from 'react-router-dom';
import rudyard from '/src/assets/rudyardtech.png';

const navLinks = [
  { label: 'Software Development', path: '/software' },
  { label: 'Consulting', path: '/consulting' },
  { label: 'Managed I.T.', path: '/managedit' },
  { label: 'About', path: '/about' },
  { label: 'Admin', path: '/admin' },
];

const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const toggleDrawer = (open: boolean) => () => setDrawerOpen(open);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      component="header"
      sx={{
        backgroundColor: '#0f2744',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1200,
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, md: 4 }, py: 1 }}>
        <Box>
          <Link to="/">
            <img src={rudyard} alt="Rudyard Technologies" style={{ width: 'auto', height: 48 }} />
          </Link>
        </Box>

        {isMobile ? (
          <>
            <IconButton edge="end" onClick={toggleDrawer(true)} sx={{ color: 'white' }}>
              <MenuIcon />
            </IconButton>
            <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
              <Box sx={{ width: 280, bgcolor: '#0f2744', height: '100%', color: 'white' }} role="presentation">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                  <IconButton onClick={toggleDrawer(false)} sx={{ color: 'white' }}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <List>
                  {navLinks.map((item) => (
                    <ListItem key={item.label} disablePadding>
                      <ListItemButton
                        component={Link}
                        to={item.path}
                        onClick={toggleDrawer(false)}
                        sx={{
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                          ...(location.pathname === item.path ? { bgcolor: 'rgba(255,255,255,0.1)' } : {}),
                        }}
                      >
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                  <ListItem disablePadding sx={{ mt: 2, px: 2 }}>
                    <Button
                      component={Link}
                      to="/contact"
                      onClick={toggleDrawer(false)}
                      variant="contained"
                      fullWidth
                      sx={{
                        bgcolor: '#2563eb',
                        '&:hover': { bgcolor: '#1d4ed8' },
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                      }}
                    >
                      Get a Free Quote
                    </Button>
                  </ListItem>
                </List>
              </Box>
            </Drawer>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {navLinks.map((item) => (
              <Button
                key={item.label}
                component={Link}
                to={item.path}
                sx={{
                  color: location.pathname === item.path ? 'white' : 'rgba(255,255,255,0.78)',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
                  px: 2,
                  borderRadius: '8px 8px 0 0',
                  borderBottom: location.pathname === item.path
                    ? '2px solid #60a5fa'
                    : '2px solid transparent',
                }}
              >
                {item.label}
              </Button>
            ))}
            <Button
              component={Link}
              to="/contact"
              variant="contained"
              sx={{
                ml: 2,
                bgcolor: '#2563eb',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.95rem',
                borderRadius: 2,
                px: 3,
                py: 1,
                '&:hover': { bgcolor: '#1d4ed8' },
              }}
            >
              Get a Free Quote
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
