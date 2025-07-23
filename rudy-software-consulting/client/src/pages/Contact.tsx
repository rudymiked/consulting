import { Typography } from "@mui/material";
import ContactForm from "../components/Contact/ContactForm";


const ContactPage: React.FC = () => {
    return (
        <div>
            <Typography variant="h4" align="center" gutterBottom>
                Let’s build something great—get in touch!
            </Typography>
            <ContactForm />
        </div>
    );
}

export default ContactPage;
