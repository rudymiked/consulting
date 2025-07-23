import { List, ListItem, ListItemText, Typography } from "@mui/material";

const Privacy: React.FC = () => {
    return (
        <div>
            <Typography variant="h4" align="center" gutterBottom>
                Privacy Policy
            </Typography>
            <List>
            <ListItem>
                <ListItemText primary="We value your privacy. This policy outlines how we collect, use, and protect your information." />
            </ListItem>
            <ListItem>
                <ListItemText primary="We collect personal information such as your name, email address, and any other details you provide when you contact us. This information is used solely to respond to your inquiries and provide our services." />
            </ListItem>
            <ListItem>
                <ListItemText primary="We do not share your personal information with third parties without your consent, except as required by law." />
            </ListItem>
            <ListItem>
                <ListItemText primary="If you have any questions or concerns about our privacy practices, please contact us at info@rudyardtechnologies.com." />
            </ListItem>
            </List>
            <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                Last updated: {new Date().toLocaleDateString()}
            </Typography>
        </div>
    );
};

export default Privacy;