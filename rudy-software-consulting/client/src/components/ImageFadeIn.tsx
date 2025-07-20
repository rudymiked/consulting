// ImageFadeIn.tsx
import { Box } from "@mui/material";
import { useState } from "react";

interface ImageFadeInProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  sx?: any;
}

const ImageFadeIn: React.FC<ImageFadeInProps> = ({ src, alt, style, sx }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      sx={{
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.5s ease-out",
        ...style,
        ...sx,
      }}
    />
  );
};

export default ImageFadeIn;
