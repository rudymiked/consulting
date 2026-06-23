// ImageFadeIn.tsx
import { Box } from "@mui/material";
import { useState } from "react";

interface IImageFadeInProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  sx?: any;
  loading?: "lazy" | "eager";
  fetchpriority?: "high" | "low" | "auto";
  width?: number | string;
  height?: number | string;
}

const ImageFadeIn: React.FC<IImageFadeInProps> = ({ src, alt, style, sx, loading = "lazy", fetchpriority, width, height }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      loading={loading}
      fetchpriority={fetchpriority}
      width={width}
      height={height}
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
