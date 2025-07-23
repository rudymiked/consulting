import { List, ListItem, ListItemText, Typography } from "@mui/material";

const TermsOfService: React.FC = () => {
    return (
        <>
            <Typography variant="h4" align="center" gutterBottom>
                Terms of Service
            </Typography>
            <List>
                <ListItem>
                    <ListItemText primary="By accessing or using this website, you agree to be bound by these Terms of Service and all applicable laws and regulations." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="All content provided on this site is for informational purposes only and may be subject to change without notice." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="We strive to ensure the accuracy of information, but we do not guarantee its completeness or suitability for any purpose." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="Any services or consultations provided are subject to mutual agreement and may involve additional terms or contracts." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="You agree not to misuse the site, interfere with its functionality, or attempt unauthorized access." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="Intellectual property, including branding elements and original content, is owned by Rudy Software Consulting and may not be used without permission." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="We reserve the right to update these Terms at any time, and continued use of the site constitutes acceptance of those changes." />
                </ListItem>
                <ListItem>
                    <ListItemText primary="For inquiries related to these Terms, please contact us at info@rudyardtechnologies.com." />
                </ListItem>
            </List>
        </>
    );
};

export default TermsOfService;