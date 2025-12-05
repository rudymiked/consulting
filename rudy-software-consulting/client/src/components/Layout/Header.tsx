import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Tab,
  Drawer,
  IconButton,
  List,
  ListItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from 'react-router-dom';
import rudyard from '/src/assets/rudyardtech.png'; // Make sure this resolves correctly

const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => () => setDrawerOpen(open);

  const navItems = [
    { label: 'Software Development', path: '/software' },
    { label: 'Consulting', path: '/consulting' },
    { label: 'Security & Compliance', path: '/security' },
    { label: 'Get a Free Quote', path: '/contact' },
    { label: 'About', path: '/about' },
    { label: 'Admin', path: '/admin' },
  ];

  return (
    <AppBar
      position="static"
      elevation={2}
      component="header"
      sx={{ backgroundColor: '#FEFDFB', color: 'black', padding: '10px 0' }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/">
            <img
              src={rudyard}
              alt="Logo"
              style={{ width: 'auto', height: 50, marginRight: 16 }}
            />
          </Link>
        </Box>

        {isMobile ? (
          <>
            <IconButton edge="end" color="inherit" onClick={toggleDrawer(true)}>
              <MenuIcon />
            </IconButton>
            <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
              <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
                <List>
                  {navItems.map((item) => (
                    <ListItem key={item.label} component={Link} to={item.path}>
                      <Tab label={item.label} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Drawer>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {navItems.map((item) => (
              <Tab key={item.label} component={Link} to={item.path} label={item.label} />
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
